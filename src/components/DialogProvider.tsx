"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";

/** 확인 창에 보여 줄 것 */
export interface DialogOptions {
  title: string;
  /** 제목 아래 설명 */
  message?: ReactNode;
  /** 확인 단추 글자. 기본 "확인" */
  confirmLabel?: string;
  /** 취소 단추 글자. 기본 "취소". 알리기만 하는 창이면 null(단추 하나) */
  cancelLabel?: string | null;
  /** 되돌릴 수 없는 일(지우기, 쓰던 코드 버리기)이면 danger: 확인 단추가 빨갛고 처음 초점이 취소에 간다 */
  tone?: "default" | "danger";
}

/** 창을 띄우고, 확인을 누르면 true, 취소·Esc·바깥 누르기면 false */
export type AskDialog = (options: DialogOptions) => Promise<boolean>;

type Pending = DialogOptions & { id: number; resolve: (ok: boolean) => void };

const DialogContext = createContext<AskDialog | null>(null);

/**
 * 브라우저 기본 확인 창(window.confirm, alert) 대신 쓰는 모달. 앱 맨 위(layout)에 한 번 둔다.
 * 여러 곳에서 한꺼번에 물으면 차례로 하나씩 띄운다.
 */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Pending[]>([]);
  const nextId = useRef(0);

  const ask = useCallback<AskDialog>(
    (options) =>
      new Promise((resolve) => {
        const id = nextId.current++;
        setQueue((prev) => [...prev, { ...options, id, resolve }]);
      }),
    [],
  );

  const current = queue[0];
  const answer = (pending: Pending, ok: boolean) => {
    pending.resolve(ok);
    setQueue((prev) => prev.filter((item) => item.id !== pending.id));
  };

  return (
    <DialogContext.Provider value={ask}>
      {children}
      {current && <Modal key={current.id} options={current} onAnswer={(ok) => answer(current, ok)} />}
    </DialogContext.Provider>
  );
}

export function useDialog(): AskDialog {
  const ask = useContext(DialogContext);
  if (!ask) throw new Error("DialogProvider 안에서만 쓸 수 있습니다.");
  return ask;
}

function Modal({ options, onAnswer }: { options: DialogOptions; onAnswer: (ok: boolean) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const answered = useRef(false);
  const titleId = useId();
  const messageId = useId();
  const danger = options.tone === "danger";
  const cancelLabel = options.cancelLabel === undefined ? "취소" : options.cancelLabel;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // 창을 열기 전에 초점이 있던 곳으로, 닫은 뒤 돌려준다.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    (danger && cancelRef.current ? cancelRef.current : confirmRef.current)?.focus();
    return () => {
      if (dialog.open) dialog.close();
      opener?.focus({ preventScroll: true });
    };
  }, [danger]);

  // 두 번 눌러도 한 번만 답한다.
  const finish = (ok: boolean) => {
    if (answered.current) return;
    answered.current = true;
    onAnswer(ok);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={options.message ? messageId : undefined}
      className="modal"
      // Esc는 브라우저가 창을 닫기 전에 여기서 받아 취소로 답한다.
      onCancel={(event) => {
        event.preventDefault();
        finish(false);
      }}
      // 창 밖(어두운 바탕)을 누르면 취소. 안쪽을 누른 것은 target이 안쪽 요소다.
      onClick={(event) => {
        if (event.target === event.currentTarget) finish(false);
      }}
    >
      <div className="p-5">
        <h2 id={titleId} className="text-[17px] leading-snug font-semibold">{options.title}</h2>
        {options.message && (
          <div id={messageId} className="mt-2 text-sm leading-relaxed text-muted">{options.message}</div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          {cancelLabel !== null && (
            <button ref={cancelRef} type="button" onClick={() => finish(false)} className="btn btn-line">
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            onClick={() => finish(true)}
            className={`btn ${danger ? "btn-danger" : "btn-fill"}`}
          >
            {options.confirmLabel ?? "확인"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
