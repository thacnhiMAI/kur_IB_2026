export function AuthVisualArt() {
  return (
    <div className="auth-art" aria-hidden="true">
      <span className="auth-art-ring" />
      <span className="auth-art-book is-back" />
      <span className="auth-art-book" />
      <span className="auth-art-dot" style={{ right: "15%", top: "24%" }} />
      <span className="auth-art-dot" style={{ left: "28%", top: "15%", animationDelay: "-.8s" }} />
      <span className="auth-art-dot" style={{ right: "6%", top: "57%", animationDelay: "-1.4s" }} />
    </div>
  );
}
