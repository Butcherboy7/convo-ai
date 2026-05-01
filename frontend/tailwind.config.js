module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1a1a1f',
        'surface-elevated': '#22222a',
        accent: '#f59e0b',
        'accent-muted': 'rgba(245, 158, 11, 0.12)',
        border: '#2a2a35',
        'text-primary': '#e8e8e8',
        'text-secondary': '#888898',
        'text-muted': '#55556a',
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
      }
    }
  },
  plugins: []
}
