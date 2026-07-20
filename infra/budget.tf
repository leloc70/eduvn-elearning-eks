# AWS Budgets — cảnh báo chi phí (credit-safe).
# Đo GROSS usage (không trừ credit) để biết tốc độ đốt credit.

resource "aws_budgets_budget" "monthly" {
  name         = "${local.name}-monthly"
  budget_type  = "COST"
  limit_unit   = "USD"
  limit_amount = tostring(var.monthly_budget_usd)
  time_unit    = "MONTHLY"

  # Không trừ credit/refund -> budget phản ánh mức dùng thật = tốc độ tiêu credit.
  cost_types {
    include_credit   = false
    include_refund   = false
    include_discount = true
  }

  # 50% thực chi -> nhắc nhở
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 50
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }

  # 80% thực chi -> cảnh báo
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_alert_email]
  }

  # Dự báo vượt 100% -> báo sớm trước khi thực sự vượt
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_alert_email]
  }
}
