export function ProfileQuoteWave() {
    return (
        <svg
            viewBox="0 0 600 220"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-full w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="wave1" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.02" />
                    <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.10" />
                    <stop
                        offset="100%"
                        stopColor="#8B5CF6"
                        stopOpacity="0.03"
                    />
                </linearGradient>

                <linearGradient id="wave2" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.02" />
                    <stop offset="60%" stopColor="#A78BFA" stopOpacity="0.08" />
                    <stop
                        offset="100%"
                        stopColor="#A78BFA"
                        stopOpacity="0.01"
                    />
                </linearGradient>
            </defs>

            <path
                d="M0 180
           C90 170, 130 130, 220 145
           C310 160, 340 95, 420 110
           C500 125, 520 75, 600 90
           L600 220
           L0 220
           Z"
                fill="url(#wave1)"
            />

            <path
                d="M0 195
           C110 185, 150 155, 245 165
           C340 175, 390 130, 470 145
           C540 158, 565 120, 600 125
           L600 220
           L0 220
           Z"
                fill="url(#wave2)"
            />
        </svg>
    );
}
