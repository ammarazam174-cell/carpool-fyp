import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/theme/colors";
import { getWalletBalance, listWalletTransactions } from "@/api/api";
import type { Transaction, TransactionType } from "@/types/wallet";

import BalanceCard from "./components/BalanceCard";
import TransactionRow from "./components/TransactionRow";
import EmptyState from "./components/EmptyState";
import SkeletonRow from "./components/SkeletonRow";

type AnyNav = NativeStackNavigationProp<any>;

type Filter = "All" | "TopUp" | "Ride" | "Refund";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "All",    label: "All"      },
  { key: "TopUp",  label: "Top-Ups"  },
  { key: "Ride",   label: "Rides"    },
  { key: "Refund", label: "Refunds"  },
];

function matchesFilter(t: Transaction, f: Filter): boolean {
  if (f === "All") return true;
  if (f === "TopUp")  return t.type === "TopUp";
  if (f === "Refund") return t.type === "Refund";
  if (f === "Ride")
    return t.type === "RidePayment" || t.type === "DriverEarning";
  return true;
}

export default function WalletScreen() {
  const nav = useNavigation<AnyNav>();
  const insets = useSafeAreaInsets();

  const [balance, setBalance]     = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [txns, setTxns]           = useState<Transaction[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefresh]  = useState(false);
  const [filter, setFilter]       = useState<Filter>("All");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [bal, list] = await Promise.all([
        getWalletBalance(),
        listWalletTransactions(80),
      ]);
      setBalance(bal.balance);
      setUpdatedAt(bal.updatedAt);
      setTxns(list);
    } catch {
      // The axios response interceptor already attaches a useful message;
      // bubble it up via inline UI in the empty state instead of an Alert
      // so the screen stays interactive.
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(() => {
    setRefresh(true);
    load(true);
  }, [load]);

  const goTopUp = useCallback(() => {
    nav.navigate("WalletTopUp");
  }, [nav]);

  const filtered = useMemo(
    () => txns.filter((t) => matchesFilter(t, filter)),
    [txns, filter]
  );

  const Header = (
    <View>
      <BalanceCard
        balance={balance}
        updatedAt={updatedAt}
        onTopUp={goTopUp}
      />

      {/* Section header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 24,
          marginBottom: 10,
        }}
      >
        <Text
          style={{
            color: COLORS.textLight,
            fontSize: 17,
            fontWeight: "800",
            letterSpacing: 0.2,
          }}
        >
          Activity
        </Text>
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
        </Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: active ? COLORS.accent : COLORS.cardAlt,
                borderWidth: 1,
                borderColor: active ? COLORS.accent : COLORS.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: active ? "#052e16" : COLORS.textLight,
                  fontSize: 12.5,
                  fontWeight: "700",
                  letterSpacing: 0.3,
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        paddingTop: insets.top + 8,
      }}
    >
      <View
        style={{
          paddingHorizontal: 18,
          paddingBottom: 6,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            color: COLORS.textLight,
            fontSize: 24,
            fontWeight: "800",
            letterSpacing: 0.2,
          }}
        >
          My Wallet
        </Text>
      </View>

      {loading ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingBottom: insets.bottom + 100,
          }}
        >
          {Header}
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ScrollView>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => <TransactionRow txn={item} />}
          ListHeaderComponent={Header}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-long"
              title={filter === "All" ? "No transactions yet" : "No matching transactions"}
              message={
                filter === "All"
                  ? "Top up your wallet to start booking rides — your activity will appear here."
                  : "Try a different filter to see more activity."
              }
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
