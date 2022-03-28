import {
  Flex,
  Item,
  Slider,
  Text
} from '@adobe/react-spectrum';
import React, {useState} from 'react';

function importAll(r) {
  return r.keys().map(r);
}

const images = importAll(require.context('./docs-differ/diff', false, /\.(png)$/));

function DiffSlider() {
  let [position, setPosition] = useState(0);
  let [zoom, setZoom] = useState(1);
  let numImages = images.length;
  let imgPath = images[position].default;

  return (
    <>
      <Slider
        marginTop="size-100"
        minValue={1}
        maxValue={numImages}
        value={position + 1}
        onChange={(index) => setPosition(index - 1)}
        label="Nth image diff displayed"
        getValueLabel={(index) => `${index} of ${numImages} changes`}
        width="50%" />
      <Flex direction="column" gap="size-200" marginTop="size-600" marginBottom="size-300" minHeight="0px" flex={1}>
        <Text UNSAFE_style={{fontWeight: 'bold'}}>File: {imgPath}</Text>
        <Slider
          label="Zoom"
          value={zoom}
          onChange={setZoom}
          minValue={1}
          maxValue={4} />
        <div style={{overflow: 'auto', minHeight: "0px", flex: 1}} tabIndex={0}>
          <img
            alt={`image diff, file name: ${imgPath}`}
            src={imgPath}
            style={{
              display: 'block',
              maxWidth: '100%',
              transform: `scale(${zoom})`,
              transformOrigin: '0 0'
            }} />
        </div>
      </Flex>
    </>
  );
}

export {DiffSlider};
