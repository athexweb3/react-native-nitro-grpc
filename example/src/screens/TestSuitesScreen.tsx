import React, { useLayoutEffect } from 'react';
import { View, StyleSheet, FlatList, Button, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TestItem } from '../components/TestItem';
import { useTestsList } from '../hooks/useTestsList';
import { useTestsRun } from '../hooks/useTestsRun';
import { colors } from '../styles/colors';

export function TestSuitesScreen() {
  const navigation = useNavigation();
  const [suites, toggle, checkAll, clearAll] = useTestsList();
  const [results, runTests, stats] = useTestsRun();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          title={stats ? 'Running...' : 'Run'}
          disabled={!!stats && !stats.duration}
          onPress={() => runTests(suites)}
        />
      ),
    });
  }, [navigation, runTests, suites, stats]);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Button title="Check All" onPress={checkAll} />
        <Button title="Clear All" onPress={clearAll} />
      </View>
      <FlatList
        data={Object.keys(suites)}
        keyExtractor={item => item}
        renderItem={({ item, index }) => {
          const suite = suites[item];
          return (
            <TestItem
              suiteIndex={index}
              description={item}
              value={suite!.value}
              count={Object.keys(suite!.tests).length}
              results={results[item]?.results || []}
              onToggle={toggle}
            />
          );
        }}
      />
      {stats && stats.duration > 0 && (
        <View style={styles.stats}>
          <Text>Duration: {stats.duration.toFixed(0)}ms</Text>
          <Text style={{ color: colors.green }}>Pass: {stats.passes}</Text>
          <Text style={{ color: colors.red }}>Fail: {stats.failures}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray,
  },
  stats: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.gray,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
