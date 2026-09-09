import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { PublicQuotation } from "@/lib/public-quotation-data";
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
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 7.5, color: COLORS.inkMuted, textAlign: "center" },
});

/**
 * Public-facing counterpart to lib/pdf/QuotationDocument.tsx, sourced from
 * the share-token-scoped data (lib/public-quotation-data.ts) rather than
 * the authenticated OrderDetail — customer names/contact info beyond name
 * aren't exposed here since this renders from a public, unauthenticated
 * request.
 */
export function PublicQuotationDocument({ quotation }: { quotation: PublicQuotation }) {
  const balancePaise = quotation.grandTotalPaise - quotation.totalPaidPaise;
  const foodAmountPaise = quotation.pricePerPlatePaise * quotation.guestCount;
  const extrasPaise = quotation.menuItems
    .filter((i) => i.isExtra)
    .reduce((sum, i) => sum + (i.extraPriceIsFlat ? i.extraPricePaise : i.extraPricePaise * quotation.guestCount), 0);

  const vegItems = quotation.menuItems.filter((i) => i.foodType !== "non_veg");
  const nonVegItems = quotation.menuItems.filter((i) => i.foodType === "non_veg");
  const showSplit = quotation.foodType === "mixed" && vegItems.length > 0 && nonVegItems.length > 0;
  const businessLabel = quotation.businessDisplayName ?? quotation.businessName;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {quotation.businessLogoUrl && <Image src={quotation.businessLogoUrl} style={styles.logo} />}
            <Text style={styles.businessName}>{businessLabel}</Text>
            {quotation.businessPhone && <Text style={styles.businessMeta}>{quotation.businessPhone}</Text>}
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>CATERING QUOTATION</Text>
            <Text style={styles.metaLine}>{quotation.quotationNumber ?? quotation.orderNumber}</Text>
            <Text style={styles.metaLine}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.twoCol}>
          <View style={styles.colBlock}>
            <Text style={styles.sectionTitle}>Customer</Text>
            <Text style={styles.value}>{quotation.customerName}</Text>
          </View>
          <View style={styles.colBlock}>
            <Text style={styles.sectionTitle}>Event</Text>
            <View style={styles.row}><Text style={styles.label}>Event</Text><Text style={styles.value}>{quotation.eventName}</Text></View>
            <View style={styles.row}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.value}>
                {new Date(quotation.eventDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            {quotation.eventStartTime && (
              <View style={styles.row}><Text style={styles.label}>Time</Text><Text style={styles.value}>{quotation.eventStartTime.slice(0, 5)}</Text></View>
            )}
            {quotation.venueName && (
              <View style={styles.row}><Text style={styles.label}>Venue</Text><Text style={styles.value}>{quotation.venueName}</Text></View>
            )}
            <View style={styles.row}><Text style={styles.label}>Guests</Text><Text style={styles.value}>{quotation.guestCount}</Text></View>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>
          {quotation.packageNameSnapshot ?? "Custom Menu"} — {formatPaise(quotation.pricePerPlatePaise)} / plate
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
          <MenuList items={quotation.menuItems} />
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Cost Summary</Text>
        <View style={styles.row}><Text style={styles.label}>Guests</Text><Text style={styles.value}>{quotation.guestCount}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Rate</Text><Text style={styles.value}>{formatPaise(quotation.pricePerPlatePaise)} / plate</Text></View>
        <View style={styles.row}><Text style={styles.label}>Food Amount</Text><Text style={styles.value}>{formatPaise(foodAmountPaise)}</Text></View>
        {extrasPaise > 0 && <View style={styles.row}><Text style={styles.label}>Extra Items</Text><Text style={styles.value}>{formatPaise(extrasPaise)}</Text></View>}
        {quotation.serviceChargePaise > 0 && <View style={styles.row}><Text style={styles.label}>Service Charge</Text><Text style={styles.value}>{formatPaise(quotation.serviceChargePaise)}</Text></View>}
        {quotation.transportChargePaise > 0 && <View style={styles.row}><Text style={styles.label}>Transport</Text><Text style={styles.value}>{formatPaise(quotation.transportChargePaise)}</Text></View>}
        {quotation.equipmentChargePaise > 0 && <View style={styles.row}><Text style={styles.label}>Equipment</Text><Text style={styles.value}>{formatPaise(quotation.equipmentChargePaise)}</Text></View>}
        {quotation.staffChargePaise > 0 && <View style={styles.row}><Text style={styles.label}>Staff</Text><Text style={styles.value}>{formatPaise(quotation.staffChargePaise)}</Text></View>}
        {quotation.otherChargesPaise > 0 && <View style={styles.row}><Text style={styles.label}>Other</Text><Text style={styles.value}>{formatPaise(quotation.otherChargesPaise)}</Text></View>}
        {quotation.discountPaise > 0 && <View style={styles.row}><Text style={styles.label}>Discount</Text><Text style={styles.value}>− {formatPaise(quotation.discountPaise)}</Text></View>}
        {quotation.taxEnabled && (
          <View style={styles.row}><Text style={styles.label}>{quotation.taxName ?? "Tax"} ({quotation.taxPercentage}%)</Text><Text style={styles.value}>{formatPaise(quotation.taxAmountPaise)}</Text></View>
        )}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalValue}>{formatPaise(quotation.grandTotalPaise)}</Text>
        </View>

        <View style={styles.balanceBox}>
          <View>
            <Text style={styles.label}>Advance Received</Text>
            <Text style={styles.value}>{formatPaise(quotation.totalPaidPaise)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Balance Due</Text>
            <Text style={[styles.value, { color: balancePaise > 0 ? COLORS.tamarind : COLORS.green }]}>
              {formatPaise(balancePaise)}
            </Text>
          </View>
        </View>

        {(quotation.upiId || quotation.bankName) && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.twoCol}>
              <View style={styles.colBlock}>
                {quotation.upiId && <View style={styles.row}><Text style={styles.label}>UPI</Text><Text style={styles.value}>{quotation.upiId}</Text></View>}
                {quotation.bankName && <View style={styles.row}><Text style={styles.label}>Bank</Text><Text style={styles.value}>{quotation.bankName}</Text></View>}
              </View>
              <View style={styles.colBlock}>
                {quotation.accountName && <View style={styles.row}><Text style={styles.label}>Account Name</Text><Text style={styles.value}>{quotation.accountName}</Text></View>}
                {quotation.accountNumber && <View style={styles.row}><Text style={styles.label}>Account No.</Text><Text style={styles.value}>{quotation.accountNumber}</Text></View>}
                {quotation.ifsc && <View style={styles.row}><Text style={styles.label}>IFSC</Text><Text style={styles.value}>{quotation.ifsc}</Text></View>}
              </View>
            </View>
          </>
        )}

        {quotation.termsSnapshot && (
          <>
            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            {quotation.termsSnapshot.split("\n\n").map((block, i) => {
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

        <Text style={styles.footer} fixed>
          {businessLabel} · Generated {new Date().toLocaleDateString("en-IN")}
        </Text>
      </Page>
    </Document>
  );
}

function MenuList({ items }: { items: PublicQuotation["menuItems"] }) {
  const byCategory = new Map<string, PublicQuotation["menuItems"]>();
  items.forEach((item) => {
    const key = item.categoryNameSnapshot;
    byCategory.set(key, [...(byCategory.get(key) ?? []), item]);
  });

  return (
    <>
      {Array.from(byCategory.entries()).map(([category, categoryItems]) => (
        <View key={category}>
          <Text style={styles.categoryLabel}>{category}</Text>
          {categoryItems.map((item, i) => (
            <Text key={i} style={styles.itemLine}>
              {item.menuItemNameSnapshot}
              {item.isExtra ? <Text style={styles.extraTag}>  (extra)</Text> : null}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
}
