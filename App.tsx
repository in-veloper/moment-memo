import React, { useEffect } from 'react';
import {
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';
import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';
import Home from './src/screens/Home';
import MobileAds from 'react-native-google-mobile-ads';

function App(): React.JSX.Element {
  useEffect(() => {
    MobileAds()
      .initialize()
      .then(() => {

      })
  }, [])

  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <View style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <Home />
    </View>
  );
}

export default App;
