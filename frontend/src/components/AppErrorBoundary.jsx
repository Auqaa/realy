import React from 'react';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('App crashed', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
          <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">НаРязань</p>
            <h1 className="mt-3 text-2xl font-bold">Что-то пошло не так</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Страница не смогла загрузиться корректно. Обновите её один раз. Если проблема останется, откройте сайт
              заново или перезапустите сервер.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
