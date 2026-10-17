import "./Card.css";

export const Card = ({ children, className = "" }) => (
  <section className={`card ${className}`}>{children}</section>
);
