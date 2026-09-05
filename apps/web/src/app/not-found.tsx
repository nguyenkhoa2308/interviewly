import Link from 'next/link';

export default function NotFoundPage() {
    return (
        <main className="bg-background grid min-h-screen place-items-center px-6 py-24 sm:py-32 lg:px-8">
            <div className="text-center">
                <p className="text-primary text-3xl font-extrabold">404</p>
                <h1 className="text-foreground mt-4 text-5xl font-extrabold tracking-tight text-balance sm:text-7xl">
                    Page not found
                </h1>
                <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8">
                    Sorry, we couldn’t find the page you’re looking for.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link
                        href="/"
                        className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-[15px] font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        Go back home
                    </Link>
                    <Link
                        href="#"
                        className="text-[15px] font-bold text-gray-900"
                    >
                        Contact support <span aria-hidden="true">&rarr;</span>
                    </Link>
                </div>
            </div>
        </main>
    );
}
