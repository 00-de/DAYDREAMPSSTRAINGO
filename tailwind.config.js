/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cab:      '#141A22',  // 運転台パネルの鉄色
        panel:    '#1E2733',
        rail:     '#3A4756',
        lamp: {
          green:  '#3FE07A',  // 進行
          amber:  '#FFB020',  // 注意
          red:    '#FF4A4A',  // 停止
        },
        led:      '#FFC24A',  // 速度計LED
      },
      fontFamily: {
        gauge: ['"DSEG7 Classic"', '"Roboto Mono"', 'monospace'],
        panel: ['"Noto Sans JP"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        inset: 'inset 0 2px 8px rgba(0,0,0,.6)',
      },
    },
  },
  plugins: [],
};
