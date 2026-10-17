import "./Field.css";

export const Field = ({ label, children, ...props }) => (
  <label className="field">
    <span>{label}</span>
    {children || (
      <input
        placeholder={
          props.type === "number"
            ? "0"
            : props.type === "password"
              ? "Enter PIN"
              : `Enter ${label.toLowerCase()}`
        }
        {...props}
      />
    )}
  </label>
);
