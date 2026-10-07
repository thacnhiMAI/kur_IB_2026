export function AuthVisualArt() {
  return (
    <div className="auth-art" aria-hidden="true">
      <span className="auth-art-ring" />
      <span className="auth-art-book is-back" />
      <span className="auth-art-book" />
      <span className="auth-art-dot" style={{ right: "58px", top: "122px" }} />
      <span className="auth-art-dot" style={{ right: "210px", top: "98px", animationDelay: "-.8s" }} />
      <span className="auth-art-dot" style={{ right: "38px", top: "330px", animationDelay: "-1.4s" }} />
    </div>
  );
}
