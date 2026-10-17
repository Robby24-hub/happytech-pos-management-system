import "./Notifications.css";
import { Modal, Button, Empty } from "../UI";
export default function Notifications({
  notifications,
  update,
  navigate,
  onClose,
}) {
  const mark = (id, changes) =>
    update((s) => ({
      ...s,
      notificationState: {
        ...s.notificationState,
        [id]: { ...s.notificationState[id], ...changes },
      },
    }));
  return (
    <Modal title="Notifications" drawer onClose={onClose}>
      {notifications.some((n) => !n.read) && (
        <Button
          className="mb-4"
          onClick={() =>
            update((s) => ({
              ...s,
              notificationState: {
                ...s.notificationState,
                ...Object.fromEntries(
                  notifications.map((n) => [
                    n.id,
                    { ...s.notificationState[n.id], read: true },
                  ]),
                ),
              },
            }))
          }
        >
          Mark all as read
        </Button>
      )}
      {notifications.length ? (
        notifications.map((n) => (
          <article
            key={n.id}
            className={`notice-item ${n.tone} ${n.read ? "read" : "unread"}`}
          >
            <button
              className="notice-target"
              onClick={() => {
                mark(n.id, { read: true });
                navigate(n.target);
              }}
            >
              <strong>{n.title}</strong>
              <span>{n.message}</span>
              <small>
                Open {n.target === "pos" ? "POS" : "Inventory"}
                {n.read ? " · Read" : " · Unread"}
              </small>
            </button>
            <div className="notice-actions">
              {!n.read && (
                <Button onClick={() => mark(n.id, { read: true })}>
                  Mark as read
                </Button>
              )}
              <Button
                danger
                onClick={() => mark(n.id, { removed: true, read: true })}
              >
                Remove
              </Button>
            </div>
          </article>
        ))
      ) : (
        <Empty>No notifications.</Empty>
      )}
    </Modal>
  );
}
