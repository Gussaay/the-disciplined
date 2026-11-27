import { Component } from 'react';

/** A crash in one screen shows a way back instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // Keep the real cause on the device (and show it below) so a screenshot
    // of this screen says what actually failed, not just that something did.
    try {
      localStorage.setItem(
        'td:lastError',
        JSON.stringify({
          message: String(error?.message || error || ''),
          stack: String(error?.stack || '').split('\n').slice(0, 4).join('\n'),
          path: window.location.pathname,
          at: new Date().toISOString(),
        }),
      );
    } catch { /* storage unavailable: the screen still shows the message */ }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = String(this.state.error?.message || this.state.error || '');
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-4xl" aria-hidden>🧭</p>
        <h1 className="text-xl font-extrabold">Something went wrong · حدث خطأ</h1>
        <p className="muted max-w-sm text-sm">Your data is safe on this device. · بياناتك محفوظة على هذا الجهاز.</p>
        {message && <p className="muted max-w-sm break-words text-xs" dir="ltr">{message}</p>}
        <button
          className="btn-primary"
          onClick={() => {
            window.location.href = import.meta.env.BASE_URL;
          }}
        >
          Reload · إعادة التحميل
        </button>
      </div>
    );
  }
}
