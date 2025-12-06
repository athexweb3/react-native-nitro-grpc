import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../styles/colors';
import type { TestResult } from '../types/Results';

type RootStackParamList = {
    TestDetails: { results: TestResult[]; suiteName: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'TestDetails'>;

export function TestDetailsScreen({ route }: any) {
    const { results, suiteName } = route.params;

    return (
        <View style={styles.container}>
            <Text style={styles.header}>{suiteName}</Text>
            <FlatList
                data={results}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <View style={[styles.item, item.type === 'correct' ? styles.pass : styles.fail]}>
                        <Text style={styles.desc}>{item.description}</Text>
                        <Text>{item.duration?.toFixed(2)}ms</Text>
                        {item.errorMsg && <Text style={styles.error}>{item.errorMsg}</Text>}
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    header: {
        fontSize: 20,
        fontWeight: 'bold',
        padding: 15,
    },
    item: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray,
    },
    pass: {
        borderLeftWidth: 5,
        borderLeftColor: colors.green,
    },
    fail: {
        borderLeftWidth: 5,
        borderLeftColor: colors.red,
    },
    desc: {
        fontSize: 16,
        fontWeight: '600',
    },
    error: {
        color: colors.red,
        marginTop: 5,
    },
});
