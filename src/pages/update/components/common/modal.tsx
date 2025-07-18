import { BiExit } from "react-icons/bi";

type Props = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({ title, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl m-4 bg-slate-100 rounded-lg shadow-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-200"
          >
            <BiExit className="h-6 w-6 text-slate-600" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
