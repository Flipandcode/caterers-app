import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { OrderDetail } from "@/lib/order-detail-data";
import { BusinessPdfData } from "./business-data";
import { formatPaise } from "@/lib/money";

const COLORS = {
  ink: "#221D16",
  inkMuted: "#8C8272",
  marigold: "#C9860A",
  green: "#2F4A3C",
  tamarind: "#7A2734",
  border: "#E5DFD3",
  bg: "#FAF6EF",
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: COLORS.ink, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 56, height: 56, objectFit: "contain", marginBottom: 6 },
  businessName: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  businessMeta: { fontSize: 8.5, color: COLORS.inkMuted, marginTop: 1 },
  titleBlock: { alignItems: "flex-end" },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COLORS.marigold, letterSpacing: 0.5 },
  metaLine: { fontSize: 8.5, color: COLORS.inkMuted, marginTop: 2 },

  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginVertical: 12 },

  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  twoCol: { flexDirection: "row", justifyContent: "space-between" },
  colBlock: { width: "48%" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  label: { color: COLORS.inkMuted },
  value: { fontFamily: "Helvetica-Bold" },

  categoryLabel: { fontSize: 8, color: COLORS.inkMuted, marginTop: 5, textTransform: "uppercase" },
  itemLine: { fontSize: 10, marginTop: 1 },
  extraTag: { fontSize: 7.5, color: COLORS.marigold },

  menuColumns: { flexDirection: "row", gap: 20 },
  menuColumn: { flex: 1 },
  menuColumnTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 3 },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.ink,
    marginTop: 6,
    paddingTop: 6,
  },
  totalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  totalValue: { fontSize: 13, fontFamily: "Helvetica-Bold" },

  balanceBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 3,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  termsText: { fontSize: 8.5, color: COLORS.ink, lineHeight: 1.5, marginBottom: 5 },
  termsTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },

  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  signatureBlock: { width: "45%" },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: COLORS.ink, marginTop: 24, marginBottom: 3 },
  signatureLabel: { fontSize: 8, color: COLORS.inkMuted },

  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7.5, color: COLORS.inkMuted, textAlign: "center" },
});

interface QuotationDocumentProps {
  order: OrderDetail;
  business: BusinessPdfData;
  quotationNumber: string;
  version: number;
  documentTitle: "CATERING QUOTATION" | "CATERING ORDER CONFIRMATION";
}

export function QuotationDocument({ order, business, quotationNumber, version, documentTitle }: QuotationDocumentProps) {
  const balancePaise = order.grandTotalPaise - order.totalPaidPaise;
  const foodAmountPaise = order.pricePerPlatePaise * order.guestCount;
  const extrasPaise = order.menuItems
    .filter((i) => i.isExtra)
    .reduce((sum, i) => sum + (i.extraPriceIsFlat ? i.extraPricePaise : i.extraPricePaise * order.guestCount), 0);

  const vegItems = order.menuItems.filter((i) => i.foodType !== "non_veg");
  const nonVegItems = order.menuItems.filter((i) => i.foodType === "non_veg");
  const showSplit = order.foodType === "mixed" && vegItems.length > 0 && nonVegItems.length > 0;

  const businessAddressLine = [business.address, business.city, business.state, business.pinCode]
    .filter(Boolean)
    .join(", ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {business.logoUrl && <Image src={business.logoUrl} style={styles.logo} />}
            <Text style={styles.businessName}>{business.displayName ?? business.name}</Text>
            {businessAddressLine && <Text style={styles.businessMeta}>{businessAddressLine}</Text>}
            {business.phone && <Text style={styles.businessMeta}>{business.phone}{business.email ? `  ·  ${business.email}` : ""}</Text>}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{documentTitle}</Text>
            <Text style={styles.metaLine}>{quotationNumber}{version > 1 ? `  (v${version})` : ""}</Text>
            <Text style={styles.metaLine}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.twoCol}>
          <View style={styles.colBlock}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text style={styles.value}>{order.customer.name}</Text>
            <Text style={styles.businessMeta}>{order.customer.phone}</Text>
          </View>
          <View style={styles.colBlock}>
            <Text style={styles.sectionTitle}>Event</Text>
            <View style={styles.row}><Text style={styles.label}>Event</Text><Text style={styles.value}>{order.eventName}</Text></View>
            <View style={styles.row}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>
                {new Date(order.eventDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            {order.eventStartTime && (
              <View style={styles.row}><Text style={styles.label}>Time</Text><Text style={styles.value}>{order.eventStartTime.slice(0, 5)}</Text></View>
            )}
            {order.venueName && (
              <View style={styles.row}><Text style={styles.label}>Venue</Text><Text style={styles.value}>{order.venueName}</Text></View>
            )}
            <View style={styles.row}><Text style={styles.label}>Guests</Text><Text style={styles.value}>{order.guestCount}</Text></View>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>
          {order.packageNameSnapshot ?? "Custom Menu"} — {formatPaise(order.pricePerPlatePaise)} / plate
        </Text>
        {showSplit ? (
          <View style={styles.menuColumns}>
            <View style={styles.menuColumn}>
              <Text style={styles.menuColumnTitle}>Vegetarian</Text>
              <MenuList items={vegItems} />
            </View>
            <View style={styles.menuColumn}>
              <Text style={styles.menuColumnTitle}>Non-Vegetarian</Text>
              <MenuList items={nonVegItems} />
            </View>
          </View>
        ) : (
          <MenuList items={order.menuItems} />
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Cost Summary</Text>
        <View style={styles.row}><Text style={styles.label}>Guests</Text><Text style={styles.value}>{order.guestCount}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Rate</Text><Text style={styles.value}>{formatPaise(order.pricePerPlatePaise)} / plate</Text></View>
        <View style={styles.row}><Text style={styles.label}>Food Amount</Text><Text style={styles.value}>{formatPaise(foodAmountPaise)}</Text></View>
        {extrasPaise > 0 && <View style={styles.row}><Text style={styles.label}>Extra Items</Text><Text style={styles.value}>{formatPaise(extrasPaise)}</Text></View>}
        {order.serviceChargePaise > 0 && <View style={styles.row}><Text style={styles.label}>Service Charge</Text><Text style={styles.value}>{formatPaise(order.serviceChargePaise)}</Text></View>}
        {order.transportChargePaise > 0 && <View style={styles.row}><Text style={styles.label}>Transport</Text><Text style={styles.value}>{formatPaise(order.transportChargePaise)}</Text></View>}
        {order.equipmentChargePaise > 0 && <View style={styles.row}><Text style={styles.label}>Equipment</Text><Text style={styles.value}>{formatPaise(order.equipmentChargePaise)}</Text></View>}
        {order.staffChargePaise > 0 && <View style={styles.row}><Text style={styles.label}>Staff</Text><Text style={styles.value}>{formatPaise(order.staffChargePaise)}</Text></View>}
        {order.otherChargesPaise > 0 && <View style={styles.row}><Text style={styles.label}>Other</Text><Text style={styles.value}>{formatPaise(order.otherChargesPaise)}</Text></View>}
        {order.discountPaise > 0 && <View style={styles.row}><Text style={styles.label}>Discount</Text><Text style={styles.value}>− {formatPaise(order.discountPaise)}</Text></View>}
        {order.taxEnabled && (
          <View style={styles.row}><Text style={styles.label}>{order.taxName ?? "Tax"} ({order.taxPercentage}%)</Text><Text style={styles.value}>{formatPaise(order.taxAmountPaise)}</Text></View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatPaise(order.grandTotalPaise)}</Text>
        </View>

        <View style={styles.balanceBox}>
          <View>
            <Text style={styles.label}>Advance Received</Text>
            <Text style={styles.value}>{formatPaise(order.totalPaidPaise)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Balance Due</Text>
            <Text style={[styles.value, { color: balancePaise > 0 ? COLORS.tamarind : COLORS.green }]}>
              {formatPaise(balancePaise)}
            </Text>
          </View>
        </View>

        {(business.upiId || business.bankName) && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.twoCol}>
              <View style={styles.colBlock}>
                {business.upiId && <View style={styles.row}><Text style={styles.label}>UPI</Text><Text style={styles.value}>{business.upiId}</Text></View>}
                {business.bankName && <View style={styles.row}><Text style={styles.label}>Bank</Text><Text style={styles.value}>{business.bankName}</Text></View>}
              </View>
              <View style={styles.colBlock}>
                {business.accountName && <View style={styles.row}><Text style={styles.label}>Account Name</Text><Text style={styles.value}>{business.accountName}</Text></View>}
                {business.accountNumber && <View style={styles.row}><Text style={styles.label}>Account No.</Text><Text style={styles.value}>{business.accountNumber}</Text></View>}
                {business.ifsc && <View style={styles.row}><Text style={styles.label}>IFSC</Text><Text style={styles.value}>{business.ifsc}</Text></View>}
              </View>
            </View>
          </>
        )}

        {order.termsSnapshot && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            {order.termsSnapshot.split("\n\n").map((block, i) => {
              const [first, ...rest] = block.split("\n");
              return (
                <Text key={i} style={styles.termsText}>
                  <Text style={styles.termsTitle}>{first}: </Text>
                  {rest.join(" ")}
                </Text>
              );
            })}
          </>
        )}

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Customer Confirmation</Text>
            <Text style={styles.signatureLabel}>Name: {order.customer.name}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signature / Date</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>For {business.displayName ?? business.name}</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Signature / Date</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {business.displayName ?? business.name} · Generated {new Date().toLocaleDateString("en-IN")}
        </Text>
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
              {item.isExtra ? <Text style={styles.extraTag}>  (extra)</Text> : null}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}
