interface Props {
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Своё окно подтверждения (вместо системного confirm — оно одинаково выглядит везде, в том числе в APK). */
export default function ConfirmModal({ title, text, confirmLabel, danger, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-6 fade-in" onClick={onCancel}>
      <div className="panel rounded-2xl p-5 max-w-sm w-full pop-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black text-amber-300 text-center mb-2 text-stroke">{title}</h3>
        <p className="text-sm text-purple-200 text-center mb-4 leading-snug whitespace-pre-line">{text}</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="btn-fantasy py-2.5 rounded-xl font-bold text-sm">Отмена</button>
          <button onClick={onConfirm} className={`${danger ? 'btn-fantasy' : 'btn-purple'} py-2.5 rounded-xl font-bold text-sm`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
