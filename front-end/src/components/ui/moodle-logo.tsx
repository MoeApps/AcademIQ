export function MoodleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
        fill="#F98012"
      />
      <path
        d="M12 4.5c-1.1 0-2 .67-2 1.5v2.5L7.5 10v4.5c0 .83.9 1.5 2 1.5s2-.67 2-1.5V10L9 8.5V6c0-.83.9-1.5 2-1.5h2c1.1 0 2 .67 2 1.5v2.5L12.5 10v4.5c0 .83.9 1.5 2 1.5s2-.67 2-1.5V10l-2.5-1.5V6c0-.83-.9-1.5-2-1.5h-2z"
        fill="white"
        fillRule="evenodd"
      />
      <path
        d="M7 17.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5zM17 17.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5zM12 19a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z"
        fill="white"
      />
    </svg>
  );
}
