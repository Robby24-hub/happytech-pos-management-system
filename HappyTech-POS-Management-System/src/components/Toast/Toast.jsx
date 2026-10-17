import "./Toast.css";
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
export function Toast({ message }) {
  if (!message) return null;
  const text = typeof message === "string" ? message : message.message;
  const tone = typeof message === "string" ? "success" : message.tone;
  const Icon =
    tone === "danger"
      ? AlertCircle
      : ["warning", "alert"].includes(tone)
        ? AlertTriangle
        : CheckCircle;
  return (
    <div role="status" className={`toast toast-${tone}`}>
      <Icon size={20} />
      {text}
    </div>
  );
}
