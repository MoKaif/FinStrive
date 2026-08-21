namespace api.Dtos.Portfolio
{
    public class EmailTransactionSyncResult
    {
        public int Scanned { get; set; }
        public int Matched { get; set; }
        public int Created { get; set; }
        public int Duplicates { get; set; }
        public int Ignored { get; set; }
    }
}
