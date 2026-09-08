import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { OrderDetail } from "@/lib/order-detail-data";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 11, fontFamily: "Helvetica", color: "#221D16" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 11, color: "#8C8272", marginBottom: 12 },
  guestBadge: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 16 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#E5DFD3", marginVertical: 12 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, color: "#8C8272" },
  categoryLabel: { fontSize: 9, color: "#8C8272", textTransform: "uppercase", marginTop: 8, marginBottom: 2 },
  itemLine: { fontSize: 12, marginTop: 2 },
  notesBox: { marginTop: 4, padding: 8, backgroundColor: "#FAF6EF", borderRadius: 3 },
});

/**
 * Deliberately omits customer pricing entirely — per the spec, kitchen
 * staff should see what to prepare and for how many, never what the
 * customer is being charged.
 */
export function KitchenSheetDocument({ order }: { order: OrderDetail }) {
  const vegItems = order.menuItems.filter((i) => i.foodType !== "non_veg");
  const nonVegItems = order.menuItems.filter((i) => i.foodType === "non_veg");
  const showSplit = order.foodType === "mixed" && vegItems.length > 0 && nonVegItems.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{order.eventName}</Text>
        <Text style={styles.subtitle}>{order.orderNumber} · {order.customer.name}</Text>
        <Text style={styles.guestBadge}>{order.guestCount} Guests</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Menu</Text>
        {showSplit ? (
          <>
            <Text style={styles.categoryLabel}>— Vegetarian —</Text>
            <MenuList items={vegItems} />
            <Text style={styles.categoryLabel}>— Non-Vegetarian —</Text>
            <MenuList items={nonVegItems} />
          </>
        ) : (
          <MenuList items={order.menuItems} />
        )}

        {order.specialInstructions && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesBox}>
              <Text>{order.specialInstructions}</Text>
            </View>
          </>
        )}
      </Page>
    </Document>
  );
}

function MenuList({ items }: { items: OrderDetail["menuItems"] }) {
  const byCategory = new Map<string, OrderDetail["menuItems"]>();
  items.forEach((item) => {
    const key = item.categoryNameSnapshot;
    byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
  });

  return (
    <>
      {Array.from(byCategory.entries()).map(([category, categoryItems]) => (
        <View key={category}>
          <Text style={styles.categoryLabel}>{category}</Text>
          {categoryItems.map((item) => (
            <Text key={item.id} style={styles.itemLine}>
              {item.menuItemNameSnapshot}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}
