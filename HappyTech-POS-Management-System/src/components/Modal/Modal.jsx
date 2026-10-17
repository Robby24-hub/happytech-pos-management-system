import "./Modal.css";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  drawer = false,
  className = "",
  overlayClassName = "",
  ariaLabel,
  closeLabel = "Close dialog",
}) {
  const ref = useRef();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement;
    const focusables = () =>
      [
        ...ref.current.querySelectorAll("button,input,select,textarea,a[href]"),
      ].filter((e) => !e.disabled);
    focusables()[0]?.focus();
    const key = (e) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key === "Tab") {
        const a = focusables();
        if (e.shiftKey && document.activeElement === a[0]) {
          e.preventDefault();
          a.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === a.at(-1)) {
          e.preventDefault();
          a[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className={`modal-overlay ${drawer ? "drawer-overlay" : ""} ${overlayClassName}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={
          ariaLabel || (typeof title === "string" ? title : "Navigation")
        }
        className={`modal ${wide ? "wide" : ""} ${drawer ? "drawer" : ""} ${className}`}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-content">{children}</div>
      </section>
    </div>
  );
}
