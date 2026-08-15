import type { Preview } from '@storybook/react-vite'
import '@ods-ai/tokens/tokens.css'

const preview: Preview = {
  initialGlobals: {
    theme: 'light',
  },
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = (context.globals?.theme as string | undefined) ?? 'light'
      document.documentElement.dataset.theme = theme
      return Story()
    },
  ],
}

export default preview
