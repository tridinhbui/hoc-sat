"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ProctorEventType } from "@/lib/exam/types";

/**
 * Lockdown phía trình duyệt.
 *
 * Nói thẳng về giới hạn: cái này KHÔNG chặn được học sinh dùng điện thoại
 * thứ hai hay máy khác. Nó ngăn hành vi vô ý (chuyển tab, copy nhầm) và
 * tạo log để giáo viên đối chiếu. Muốn chống gian lận nghiêm ngặt thì
 * phải thi tập trung tại phòng máy. Xem PLAN.md §3.
 *
 * Mọi thứ ở đây chỉ là lớp ngoài. Lớp thật nằm ở server: `expires_at`
 * và mọi lần ghi đáp án đều được đối chiếu lại.
 */
export function useLockdown({
  enabled,
  attemptId,
  onEvent,
}: {
  enabled: boolean;
  attemptId: string;
  onEvent: (type: ProctorEventType, meta?: Record<string, unknown>) => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [multiTab, setMultiTab] = useState(false);

  // Ref để listener luôn gọi callback mới nhất mà không phải gắn lại
  // toàn bộ event listener mỗi lần component render.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
    } catch {
      // Trình duyệt từ chối (thường vì không phải cử chỉ người dùng).
      setFullscreen(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const fire = (t: ProctorEventType, meta?: Record<string, unknown>) =>
      onEventRef.current(t, meta);

    const onFullscreenChange = () => {
      const on = !!document.fullscreenElement;
      setFullscreen(on);
      if (!on) fire("fullscreen_exit");
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") fire("visibility_hidden");
    };

    const onBlur = () => fire("blur");

    const block = (t: ProctorEventType) => (e: Event) => {
      e.preventDefault();
      fire(t);
    };
    const onCopy = block("copy");
    const onPaste = block("paste");
    const onCut = block("copy");
    const onContextMenu = block("contextmenu");
    const onDragStart = (e: Event) => e.preventDefault();
    const onSelectStart = (e: Event) => {
      // Vẫn cho chọn trong ô nhập, nếu không thì không sửa được đáp án.
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (e.key === "F12" || (mod && e.shiftKey && ["i", "j", "c"].includes(k))) {
        e.preventDefault();
        fire("devtools");
        return;
      }
      if (mod && ["c", "v", "x", "p", "s", "u", "a"].includes(k)) {
        const el = e.target as HTMLElement | null;
        const inField = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
        // Trong ô nhập thì để yên: học sinh cần sửa đáp án của chính mình.
        if (inField && ["c", "v", "x", "a"].includes(k)) return;
        e.preventDefault();
        fire(k === "c" || k === "x" ? "copy" : k === "v" ? "paste" : "devtools");
      }
    };

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(
        () => fire("resize", { w: window.innerWidth, h: window.innerHeight }),
        600,
      );
    };

    // Mở đề ở tab thứ hai: tab cũ phát hiện và báo.
    const channel = new BroadcastChannel(`hocsat-exam-${attemptId}`);
    channel.postMessage({ type: "hello" });
    channel.onmessage = (ev) => {
      if (ev.data?.type === "hello") {
        setMultiTab(true);
        fire("multi_tab");
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      channel.close();
    };
  }, [enabled, attemptId]);

  return { fullscreen, multiTab, requestFullscreen };
}
