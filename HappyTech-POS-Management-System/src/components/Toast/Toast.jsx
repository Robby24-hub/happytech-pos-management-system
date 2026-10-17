import "./Toast.css";
import { CheckCircle } from "lucide-react";
export function Toast({ message }) {
  return message ? (
    <div role="status" className="toast">
      <CheckCircle size={20} />
      {message}
    </div>
  ) : null;
}
