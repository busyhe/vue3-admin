export default {
  endOfLine: 'auto',
  // 针对特定文件类型的覆盖配置
  overrides: [
    {
      files: ['*.json5'],
      options: {
        // 保留对象属性的引号样式
        quoteProps: 'preserve',
        singleQuote: false
      }
    }
  ],
  plugins: ['prettier-plugin-tailwindcss'],
  printWidth: 100,
  // 处理 Markdown 文本换行的方式，'never' 表示不自动换行
  proseWrap: 'never',
  // 在语句末尾使用分号
  semi: false,
  // 使用单引号而非双引号
  singleQuote: true,
  // 在多行结构的末尾添加逗号，'all' 表示尽可能都添加
  trailingComma: 'none'
}
