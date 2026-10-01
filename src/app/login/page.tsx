import LoginForm from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl shadow-slate-900/5">
        <div className="flex flex-col items-center gap-1 mb-6">
          <div className="flex items-center gap-2 text-2xl font-bold text-blue-700">
            <span className="h-3 w-3 rotate-45 rounded-[3px] bg-blue-600" />
            QUICK
          </div>
          <p className="text-sm text-slate-500">Centro de Operaciones</p>
        </div>
        <LoginForm next={next ?? '/dashboard'} />
      </div>
    </main>
  );
}
