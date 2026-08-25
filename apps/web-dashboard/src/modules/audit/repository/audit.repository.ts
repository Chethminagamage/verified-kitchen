import type {
  AuditTrailData,
} from "../model/audit.model";

export class AuditRepository {
  async getAuditTrailData(): Promise<AuditTrailData> {
    return {
      kitchenName: "Verified Kitchen - Test Kitchen",

      networkName: "Verified Kitchen Consortium",

      ledgerType: "Hyperledger Fabric",

      summary: {
        totalRecords: 5,
        verifiedRecords: 4,
        pendingRecords: 1,
        failedRecords: 0,
      },

      records: [
        {
          id: "AUD-001",
          violationId: "VIO-003",
          timestamp: "25 Aug 2026, 13:16",

          eventType: "Environmental Violation",

          description:
            "Refrigerator temperature exceeded the configured monitoring range.",

          kitchenId: "KITCHEN-001",

          eventHash:
            "9f2a84e3c7f8a4b6d56f11e32c9a720b",

          transactionId:
            "TX-8B4D91F207A0",

          blockNumber: 128,

          verificationStatus: "Verified",
        },

        {
          id: "AUD-002",
          violationId: "VIO-004",
          timestamp: "25 Aug 2026, 11:23",

          eventType: "PPE Violation",

          description:
            "Mask non-compliance event recorded.",

          kitchenId: "KITCHEN-001",

          eventHash:
            "7c91fd0a26b14509bc6f83c42b4159dc",

          transactionId:
            "TX-22E53A317C11",

          blockNumber: 127,

          verificationStatus: "Verified",
        },

        {
          id: "AUD-003",
          violationId: "VIO-005",
          timestamp: "25 Aug 2026, 10:09",

          eventType: "Food Preparation Violation",

          description:
            "Dirty preparation surface event recorded.",

          kitchenId: "KITCHEN-001",

          eventHash:
            "5db21bc46dd7cf108a04933ae6f9912e",

          transactionId:
            "TX-FE91B5300A84",

          blockNumber: 126,

          verificationStatus: "Verified",
        },

        {
          id: "AUD-004",
          timestamp: "25 Aug 2026, 09:54",

          eventType: "Hygiene Score Event",

          description:
            "Overall hygiene score dropped below the configured monitoring threshold.",

          kitchenId: "KITCHEN-001",

          eventHash:
            "c611f87b5203fb3018d90e2729392810",

          transactionId:
            "TX-D2297BA1840C",

          blockNumber: 125,

          verificationStatus: "Verified",
        },

        {
          id: "AUD-005",
          violationId: "VIO-001",
          timestamp: "25 Aug 2026, 15:46",

          eventType: "PPE Violation",

          description:
            "Glove non-compliance event waiting for blockchain confirmation.",

          kitchenId: "KITCHEN-001",

          eventHash:
            "2820fd7fc3a19b789031f8c8fa83809f",

          verificationStatus: "Pending",
        },
      ],
    };
  }
}