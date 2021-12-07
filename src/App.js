import {
  defaultTheme,
  Flex,
  Image,
  Provider,
  Slider,
  View
} from '@adobe/react-spectrum';
import React, {useState} from 'react';

function importAll(r) {
  return r.keys().map(r);
}

const images = importAll(require.context('./docs-differ/diff', false, /\.(png)$/));

function App() {
  let numImages = images.length;
  let [position, setPosition] = useState(0);
  let imgPath = images[position].default;
  return (
    <Provider theme={defaultTheme}>
      <View height="100vh" overflow="scroll">
        <Flex direction="column" width="80%" margin="auto" marginTop="size-400" gap="size-600">
          <Slider
            minValue={1}
            maxValue={numImages}
            value={position + 1}
            onChange={(index) => setPosition(index - 1)}
            label="Nth image diff displayed"
            getValueLabel={(index) => `${index} of ${numImages} changes`}
            width="50%" />
          <Flex direction="column" gap="size-200">
            <span>File: {imgPath}</span>
            <Image alt={`image diff, file name: ${imgPath}`} src={imgPath} />
          </Flex>
        </Flex>
      </View>
    </Provider>
  );
}

export default App;
