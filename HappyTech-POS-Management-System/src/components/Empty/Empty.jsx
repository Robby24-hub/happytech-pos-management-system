import "./Empty.css";

export const Empty = ({ children = "No results found." }) => (
  <div className="empty">{children}</div>
);
