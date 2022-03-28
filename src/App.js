import {
  defaultTheme,
  Flex,
  Item,
  Provider,
  TabList,
  TabPanels,
  Tabs,
  Text
} from '@adobe/react-spectrum';
import {DiffCardView} from './DiffCardView';
import {DiffSlider} from './DiffSlider';
import diffJSON from './docs-differ/diff/diff.json';
import React, {useState} from 'react';

function App() {
  let summary = diffJSON.message;
  summary = summary?.replace(/Alright, there was | But are they regressions or expected changes \?/g,'')

  return (
    <Provider theme={defaultTheme}>
      <Flex direction="column" width="80%" height="100vh" margin="auto">
        <Text marginTop="size-400" UNSAFE_style={{fontWeight: 'bold'}}>Summary: {summary}</Text>
        <Tabs aria-label="Review Diffs">
          <TabList>
            <Item key="cardview">Card</Item>
            <Item key="slider">Slider</Item>
          </TabList>
          <TabPanels>
            <Item key="cardview">
              <DiffCardView />
            </Item>
            <Item key="slider">
              <DiffSlider />
            </Item>
          </TabPanels>
        </Tabs>
      </Flex>
    </Provider>
  );
}

export default App;
