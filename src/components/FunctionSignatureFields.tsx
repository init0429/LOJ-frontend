"use client";

import { useId, useState } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import type { SignaturePreviewState } from "@/hooks/useSignaturePreview";
import { LANGUAGE_LABELS } from "@/lib/languages";
import { MAX_PARAMS, TYPE_GROUPS, isKnownType, outputCandidates, type Signature } from "@/lib/signature";

function TypeSelect({
  id,
  value,
  onChange,
  allowVoid = false,
  label,
}: {
  id?: string;
  value: string;
  onChange: (type: string) => void;
  allowVoid?: boolean;
  label?: string;
}) {
  return (
    <select id={id} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="input input-code">
      {allowVoid && <option value="void">void (제자리에서 고침)</option>}
      {/* DB에 화면에 없는 꼴로 적힌 자료형이 있으면 그대로 보여 준다(백엔드가 검사한다). */}
      {!isKnownType(value) && value !== "void" && <option value={value}>{value}</option>}
      {TYPE_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.types.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/**
 * 관리자 화면의 함수 시그니처 칸: 함수 이름, 인자(이름과 자료형), 반환형.
 * 아래에 백엔드가 만든 언어별 시작 코드를 미리 보여 준다.
 */
export default function FunctionSignatureFields({
  value,
  onChange,
  state,
}: {
  value: Signature;
  onChange: (next: Signature) => void;
  state: SignaturePreviewState;
}) {
  const id = useId();
  const [language, setLanguage] = useState("python");
  const candidates = outputCandidates(value);

  const setParam = (index: number, patch: Partial<Signature["params"][number]>) =>
    onChange({ ...value, params: value.params.map((p, i) => (i === index ? { ...p, ...patch } : p)) });
  const removeParam = (index: number) =>
    onChange({ ...value, params: value.params.filter((_, i) => i !== index) });
  const addParam = () => onChange({ ...value, params: [...value.params, { name: "", type: "int" }] });

  const setReturns = (returns: string) =>
    onChange({
      ...value,
      returns,
      // void로 바꾸면 고칠 수 있는 첫 인자를 골라 둔다.
      output_param: returns === "void" ? (value.output_param && candidates.includes(value.output_param) ? value.output_param : candidates[0] ?? null) : null,
    });

  const starters = state.preview?.starters ?? {};
  const shownLanguage = starters[language] !== undefined ? language : Object.keys(starters)[0];

  return (
    <div className="space-y-4">
      <div className="field grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-function`} className="field-label">
            함수 이름<span className="field-hint">예: twoSum</span>
          </label>
          <input
            id={`${id}-function`}
            value={value.function}
            onChange={(e) => onChange({ ...value, function: e.target.value })}
            autoComplete="off"
            spellCheck={false}
            className="input input-code"
          />
        </div>
        <div>
          <label htmlFor={`${id}-returns`} className="field-label">반환형</label>
          <TypeSelect id={`${id}-returns`} value={value.returns} onChange={setReturns} allowVoid />
        </div>
      </div>

      {value.returns === "void" && (
        <div className="field">
          <label htmlFor={`${id}-output`} className="field-label">
            답으로 출력할 인자<span className="field-hint">함수가 부른 뒤 이 인자를 출력해서 채점합니다</span>
          </label>
          {candidates.length === 0 ? (
            <p className="notice-error text-sm">제자리에서 고칠 수 있는 인자(문자열이 아닌 배열, ListNode, TreeNode)가 없습니다.</p>
          ) : (
            <select
              id={`${id}-output`}
              value={value.output_param ?? ""}
              onChange={(e) => onChange({ ...value, output_param: e.target.value })}
              className="input input-code sm:max-w-xs"
            >
              {!value.output_param && <option value="">고르세요</option>}
              {candidates.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="field">
        <p className="field-label">인자<span className="field-hint">입력에 적힌 순서대로</span></p>
        <ol className="space-y-2">
          {value.params.map((param, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted">{index + 1}</span>
              <input
                aria-label={`${index + 1}번째 인자 이름`}
                placeholder="이름"
                value={param.name}
                onChange={(e) => setParam(index, { name: e.target.value })}
                autoComplete="off"
                spellCheck={false}
                className="input input-code min-w-0 flex-1"
              />
              <div className="min-w-0 flex-1">
                <TypeSelect label={`${index + 1}번째 인자 자료형`} value={param.type} onChange={(type) => setParam(index, { type })} />
              </div>
              <button
                type="button"
                onClick={() => removeParam(index)}
                aria-label={`${index + 1}번째 인자 빼기`}
                title="빼기"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-fill hover:text-fg"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
        {value.params.length === 0 && <p className="text-sm text-muted">인자가 없는 함수입니다.</p>}
        {value.params.length < MAX_PARAMS && (
          <button type="button" onClick={addParam} className="btn btn-sm btn-line mt-2">
            <Plus size={14} aria-hidden="true" />
            인자 추가
          </button>
        )}
      </div>

      <div aria-live="polite">
        {state.incomplete ? (
          <p className="text-sm text-muted">함수 이름과 인자 이름을 모두 적으면 언어별 시작 코드가 나옵니다.</p>
        ) : state.error ? (
          <p role="alert" className="notice-error text-sm">{state.error}</p>
        ) : null}
      </div>

      {state.preview && !state.incomplete && (
        <div className="box p-3">
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="시작 코드 언어">
            <span className="mr-2 text-sm font-medium">시작 코드</span>
            {Object.keys(starters).map((lang) => (
              <button
                key={lang}
                type="button"
                aria-pressed={lang === shownLanguage}
                onClick={() => setLanguage(lang)}
                className="chip"
              >
                {LANGUAGE_LABELS[lang]?.replace(/ \(.*\)$/, "") ?? lang}
              </button>
            ))}
            {state.loading && <LoaderCircle className="ml-auto animate-spin text-muted" size={14} aria-label="새로 만드는 중" />}
          </div>
          {shownLanguage && (
            <pre className="code-box mt-2 max-h-80 overflow-auto whitespace-pre">{starters[shownLanguage]}</pre>
          )}
          <p className="mt-2 text-[13px] text-muted">
            푸는 사람이 함수 구현을 고르면 이 코드로 시작합니다. 기본 라이브러리는 채점할 때 미리 넣습니다.
          </p>
        </div>
      )}
    </div>
  );
}
