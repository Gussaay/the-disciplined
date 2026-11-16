import { Component } from 'react';

/** A crash in one screen shows a way back instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-4xl" aria-hidden>🧭</p>
        <h1 className="text-xl font-extrabold">Something went wrong · حدث خطأ</h1>
        <p className="muted max-w-sm text-sm">Your data is safe on this device. · بياناتك محفوظة على هذا الجهاز.</p>
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
