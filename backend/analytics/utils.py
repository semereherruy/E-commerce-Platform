import pandas as pd
import matplotlib.pyplot as plt
import io, base64
from store.models import Order,OrderItem

def get_sales_data():
    items = OrderItem.objects.select_related("order").values(
        "order__placed_at", "quantity", "unit_price"
    )
    df = pd.DataFrame(list(items))

    if df.empty:
        return df  # no data yet

    # Compute total per item
    df["total_price"] = df["quantity"] * df["unit_price"]
    df["order__placed_at"] = pd.to_datetime(df["order__placed_at"])
    return df


def analyze_sales(df):
    daily_sales = df.groupby(df["order__placed_at"].dt.date)["total_price"].sum()
    moving_avg = daily_sales.rolling(window=7).mean()
    return daily_sales, moving_avg


def plot_sales(daily_sales, moving_avg, as_base64=True):
    plt.figure(figsize=(10,5))
    plt.plot(daily_sales.index, daily_sales.values, label="Daily Sales")
    plt.plot(moving_avg.index, moving_avg.values, linestyle="--", label="7-day Average")
    plt.title("Sales Trend & 7-Day Moving Average")
    plt.xlabel("Date")
    plt.ylabel("Revenue ($)")
    plt.legend()
    plt.grid(True, linestyle=':', alpha=0.6)

    buf = io.BytesIO()
    plt.savefig(buf, format="png", dpi=300) # Higher DPI for reports
    buf.seek(0)
    
    if as_base64:
        chart = base64.b64encode(buf.read()).decode("utf-8")
        plt.close()
        return f"data:image/png;base64,{chart}"
    
    plt.close()
    return buf.getvalue()
