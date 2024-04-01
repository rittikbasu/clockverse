export function getCurrentTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
  });
}
