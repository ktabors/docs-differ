import {ActionBar, ActionBarContainer} from '@react-spectrum/actionbar';
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Divider,
  Heading,
  Image,
  Item,
  Slider,
  Text,
  useDialogContainer
} from '@adobe/react-spectrum';
import {Card, CardView, WaterfallLayout} from '@react-spectrum/card'
import React, {useEffect, useRef, useState} from 'react';
import ZoomIn from '@spectrum-icons/workflow/ZoomIn';

function importAll(r) {
  return r.keys().map(r);
}

const imagePaths = importAll(require.context('./docs-differ/diff', false, /\.(png)$/));

const items = imagePaths.map((image, key) => ({
  key: key,
  name: image.default.slice(image.default.lastIndexOf('/') + 1),
  src: image.default
}));

function DiffCardView() {
  let [selectedKeys, setSelectedKeys] = React.useState(new Set([]));
  let [isOpen, setOpen] = React.useState(false);

  return (
    <ActionBarContainer height="700px">
      <CardView
        items={items}
        height="700px"
        width="100%"
        layout={WaterfallLayout}
        aria-label="Docs-differ GalleryLayout of diff images"
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        selectionMode="single">
        {(item) => (
          <Card textValue={item.name}>
            <Image src={item.src} />
            <Heading>
              {item.name}
            </Heading>
          </Card>
        )}
      </CardView>
      <ActionBar
        selectedItemCount={selectedKeys.size}
        onClearSelection={() => {
          setSelectedKeys(new Set());
        }}
        onAction={() => setOpen(true)}>
        <Item key="open">
          <ZoomIn />
          <Text>Inspect</Text>
        </Item>
      </ActionBar>
      <DialogContainer onDismiss={() => setOpen(false)} type="fullscreen">
        {isOpen && <ImageDialog selectedKeys={selectedKeys} />}
      </DialogContainer>
    </ActionBarContainer>
  );
}

function ImageDialog(props) {
  let dialog = useDialogContainer();
  let [zoom, setZoom] = useState(1);

  return (
    <Dialog>
      <Heading>{items[props.selectedKeys.currentKey].name}</Heading>
      <Divider />
      <Content>
        <Slider
          label="Zoom"
          value={zoom}
          onChange={setZoom}
          minValue={1}
          maxValue={4} />
        <div style={{overflow: 'auto', minHeight: "0px", flex: 1}} tabIndex={0}>
          <Image
            src={items[props.selectedKeys.currentKey].src}
            UNSAFE_style={{
              display: 'block',
              maxWidth: '100%',
              transform: `scale(${zoom})`,
              transformOrigin: '0 0'
            }}/>
        </div>
      </Content>
      <ButtonGroup>
        <Button variant="secondary" onPress={dialog.dismiss}>Close</Button>
      </ButtonGroup>
    </Dialog>
  );
}

export {DiffCardView};
