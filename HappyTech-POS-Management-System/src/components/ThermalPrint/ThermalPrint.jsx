import styles from "./ThermalPrint.css?inline";

export async function printThermal(content, title = "Receipt") {
  const { renderToStaticMarkup } = await import("react-dom/server");
  const frame = document.createElement("iframe");
  frame.title = "Print receipt";
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:80mm;height:1px;border:0";
  document.body.append(frame);
  const doc = frame.contentDocument;
  doc.title = title;
  const style = doc.createElement("style");
  style.textContent = styles;
  doc.head.append(style);
  doc.body.innerHTML = renderToStaticMarkup(content);
  const cleanup = () => frame.remove();
  frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });
  // Keep the print document available on browsers whose print dialog is asynchronous.
  const timeout = setTimeout(cleanup, 300000);
  frame.contentWindow.addEventListener(
    "afterprint",
    () => clearTimeout(timeout),
    { once: true },
  );
  frame.contentWindow.requestAnimationFrame(() =>
    frame.contentWindow.requestAnimationFrame(() => {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } catch {
        clearTimeout(timeout);
        cleanup();
      }
    }),
  );
}
