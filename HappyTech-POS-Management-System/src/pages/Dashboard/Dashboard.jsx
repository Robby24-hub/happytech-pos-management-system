import { useState } from "react";
import {
  Banknote,
  ArrowLeftRight,
  PackageCheck,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Card, Stat, Select, Icon } from "../../components/UI";
import Chart from "../../components/Chart";
import { money } from "../../data/mock";
export default function Dashboard({ state, navigate }) {
  const [period, setPeriod] = useState("Today");
  const total = state.sales
      .filter((s) => s.status !== "Refunded" && !s.uuid.startsWith("seed"))
      .reduce((n, s) => n + s.total, 15250),
    factor = period === "This Week" ? 5 : period === "This Month" ? 19 : 1,
    target =
      state.settings[
        period === "Today"
          ? "dailyTarget"
          : period === "This Week"
            ? "weeklyTarget"
            : "monthlyTarget"
      ],
    amount = total * factor;
  return (
    <main className="main dashboard">
      <div className="stats-grid">
        <Stat
          label="TODAY'S SALES"
          value={money(total)}
          caption={
            <>
              <b>↑ 12.5%</b> from yesterday
            </>
          }
          icon={<Banknote />}
        />
        <Stat
          label="TRANSACTIONS"
          value={
            58 + state.sales.filter((s) => !s.uuid.startsWith("seed")).length
          }
          caption="Today"
          icon="imgLucideArrowLeftRight"
        />
        <Stat
          label="PRODUCTS SOLD"
          value="64"
          caption={
            <>
              <b>↑ 8.4%</b> from yesterday
            </>
          }
          icon="imgLucidePackageCheck"
        />
        <Stat
          label="LOW STOCK ITEMS"
          value={
            state.products.filter((p) => p.stock < state.settings.lowStock)
              .length
          }
          caption="Needs restocking"
          icon="imgLucideAlertCircle"
          alert
        />
      </div>
      <Card className="overview">
        <div className="flex justify-between items-start">
          <div>
            <h2>Sales Overview</h2>
            <p>
              {period === "Today"
                ? "Today's"
                : period === "This Week"
                  ? "This week's"
                  : "This month's"}{" "}
              sales performance
            </p>
          </div>
          <Select
            label="Dashboard period"
            value={period}
            onChange={setPeriod}
            options={["Today", "This Week", "This Month"]}
          />
        </div>
        <div className="overview-body">
          <div className="gauge-block">
            <div className="gauge">
              <img src="/assets/fded2.svg" alt="Sales target progress arc" />
              <div>
                <strong>{Math.round((amount / target) * 100)}%</strong>
                <small>
                  of{" "}
                  {period === "Today"
                    ? "daily"
                    : period === "This Week"
                      ? "weekly"
                      : "monthly"}{" "}
                  target
                </small>
              </div>
            </div>
            <b>
              {money(amount)} / {money(target)}
            </b>
            <small>{money(Math.max(0, target - amount))} remaining</small>
          </div>
          <Chart
            values={[
              5600, 8000, 9200, 6400, 7600, 9400, 10800, 12200, 13600, 14400,
              15600,
            ].map((x) => x * factor)}
            labels={
              period === "Today"
                ? [
                    "8AM",
                    "9AM",
                    "10AM",
                    "11AM",
                    "12PM",
                    "1PM",
                    "2PM",
                    "3PM",
                    "4PM",
                    "5PM",
                    "6PM",
                  ]
                : Array.from({ length: 11 }, (_, i) => `${i + 1}`)
            }
            max={20000 * factor}
          />
        </div>
        <small className="helper">
          Illustrative performance data · New demo sales update the sales total.
        </small>
      </Card>
      <Card className="quick-actions">
        <h2>Quick Actions</h2>
        <p className="helper">Manage your store with ease</p>
        <div className="quick-grid">
          {[
            ["New Sale", "Open POS", "pos", "imgIcon"],
            ["Add Stock", "Update inventory", "inventory", "imgIcon1"],
            ["Sales History", "View transactions", "sales-history", "imgIcon2"],
            ["Reports", "View reports", "reports", "imgIcon3"],
          ].map(([name, desc, page, icon], i) => (
            <button
              key={page}
              className={i === 0 ? "primary" : ""}
              onClick={() => navigate(page)}
            >
              <Icon name={icon} />
              <span>
                <strong>{name}</strong>
                <small>{desc}</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </Card>
    </main>
  );
}
