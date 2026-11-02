function Spinner() {
  return (
    <div className="site-loading" role="status" aria-live="polite" aria-label="در حال بارگذاری">
      <div className="site-loading-glass" aria-hidden="true">
        <div className="site-loading-orbit">
          <span className="site-loading-core" />
        </div>
        <div className="site-loading-dots"><i /><i /><i /></div>
      </div>
      <span className="site-loading-label">در حال بارگذاری…</span>
    </div>
  );
}

export default Spinner;
