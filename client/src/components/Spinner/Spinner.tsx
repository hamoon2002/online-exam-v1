function Spinner() {
  return (
    <div className="site-loading" role="status" aria-live="polite" aria-label="در حال بارگذاری">
      <span className="site-loading-minimal" aria-hidden="true" />
      <span className="site-loading-label">در حال بارگذاری…</span>
    </div>
  );
}

export default Spinner;
