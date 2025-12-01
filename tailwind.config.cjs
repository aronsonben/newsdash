module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        'theme': {
          'bg': {
            'primary': 'rgb(var(--bg-primary) / <alpha-value>)',
            'secondary': 'rgb(var(--bg-secondary) / <alpha-value>)',
            'tertiary': 'rgb(var(--bg-tertiary) / <alpha-value>)',
          },
          'text': {
            'primary': 'rgb(var(--text-primary) / <alpha-value>)',
            'secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
            'muted': 'rgb(var(--text-muted) / <alpha-value>)',
          },
          'border': 'rgb(var(--border) / <alpha-value>)',
          'accent': 'rgb(var(--accent) / <alpha-value>)',
          'accent-brown': 'rgb(var(--accent-brown) / <alpha-value>)',
          'accent-yellow': 'rgb(var(--accent-yellow) / <alpha-value>)',
          'accent-blue': 'rgb(var(--accent-blue) / <alpha-value>)',
          'sidebar': {
            'bg': 'rgb(var(--sidebar-bg) / <alpha-value>)',
            'accent': 'rgb(var(--sidebar-accent) / <alpha-value>)',
          },
          'chat': {
            'bg': 'rgb(var(--chat-bg) / <alpha-value>)',
            'accent': 'rgb(var(--chat-accent) / <alpha-value>)',
          },
          'dashboard': {
            'bg': 'rgb(var(--dashboard-bg) / <alpha-value>)',
            'accent': 'rgb(var(--dashboard-accent) / <alpha-value>)',
          },
          'button': {
            'primary': 'rgb(var(--button-primary) / <alpha-value>)',
            'primary-hover': 'rgb(var(--button-primary-hover) / <alpha-value>)',
            'primary-disabled': 'rgb(var(--button-primary-disabled) / <alpha-value>)',
            'secondary': 'rgb(var(--button-secondary) / <alpha-value>)',
            'secondary-hover': 'rgb(var(--button-secondary-hover) / <alpha-value>)',
            'secondary-disabled': 'rgb(var(--button-secondary-disabled) / <alpha-value>)',
            'outlined': 'transparent',
            'outlined-border': 'rgb(var(--button-primary) / <alpha-value>)',
            'outlined-hover': 'rgb(var(--button-primary) / 0.5)',
          }
        }
      },
      fontFamily: {
        'grotesk': ['fkGroteskNeue', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};