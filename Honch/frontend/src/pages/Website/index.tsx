import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useParams, NavLink } from "react-router-dom";
import { API_BASE } from "../../utils/config";
import { useAuth } from "../../contexts/AuthContext";
import { useWebsiteContext } from "../../contexts/WebsiteContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { useRef } from "react";
import BreakdownBarList from "./components/BreakdownBarList";
import StatCard from "./components/StatCard";
import Layout from "../../components/Layout";
import { AreaChart } from "../../components/AreaChart";
import DateRangePicker from "../../components/DateRangePicker";
import RecordingsList from "./components/RecordingsList";

interface Event {
  eventName: string;
  count: number;
}

const formatDuration = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
};

const calculateTrend = (current: number, previous: number): { trend: 'up' | 'down' | 'neutral', delta: string } => {
  if (!previous || previous === 0) {
    return { trend: 'neutral', delta: '' };
  }

  const change = ((current - previous) / previous) * 100;
  const absChange = Math.abs(change);

  if (absChange < 0.1) {
    return { trend: 'neutral', delta: '0%' };
  }

  const formattedDelta = `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  return {
    trend: change > 0 ? 'up' : 'down',
    delta: formattedDelta,
  };
};

const Website = () => {
  const { token } = useAuth();
  const { selectedWebsite } = useWebsiteContext();
  const params = useParams();
  const publicId = params.publicId || selectedWebsite?.publicId;
  const [loading, setLoading] = useState(true);
  const [website, setWebsite] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [previousAnalytics, setPreviousAnalytics] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Date range state - default to last 30 days
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date;
  });

  // Calculate days from date range
  const calculateDays = (start: Date, end: Date): number => {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1; // Minimum 1 day
  };

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
    } else {
      document.removeEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  useEffect(() => {
    const days = calculateDays(startDate, endDate);

    const fetchAnalytics = async () => {
      // Fetch current period based on selected date range
      const currentResponse = await fetch(`${API_BASE}/api/analytics/${publicId}?days=${days}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const currentData = await currentResponse.json();
      setAnalytics(currentData.analytics);

      // Fetch double the days to calculate previous period for comparison
      const previousDays = days * 2;
      const previousResponse = await fetch(`${API_BASE}/api/analytics/${publicId}?days=${previousDays}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const previousData = await previousResponse.json();

      if (previousData.analytics?.trafficOverTime && previousData.analytics.trafficOverTime.length >= days) {
        const allTrafficData = previousData.analytics.trafficOverTime;
        const previousPeriodData = allTrafficData.slice(0, days); // First period (older period)

        const previousVisitors = previousPeriodData.reduce((sum: number, d: any) => sum + (d.visitors || 0), 0);
        const previousPageviews = previousPeriodData.reduce((sum: number, d: any) => sum + (d.pageviews || 0), 0);

        const currentVisitors = currentData.analytics?.visitors || 0;
        const currentSessions = currentData.analytics?.sessions || 0;
        const sessionsRatio = currentVisitors > 0 ? currentSessions / currentVisitors : 1;
        const previousSessions = Math.round(previousVisitors * sessionsRatio);

        setPreviousAnalytics({
          visitors: previousVisitors,
          pageviews: previousPageviews,
          sessions: previousSessions,
          avgDuration: currentData.analytics?.avgDuration || 0, // Use current as baseline since we can't calculate from trafficOverTime
        });
      }
    };

    const fetchEvents = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/analytics/${publicId}/events?days=${days}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        const eventsData = Array.isArray(data.events) && data.events.length > 0 ? data.events[0] : [];
        setEvents(eventsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching events:", error);
        toast.error("Failed to load events");
        setLoading(false);
      }
    };

    const fetchWebsite = async () => {
      const response = await fetch(`${API_BASE}/api/websites/${publicId}/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setWebsite(data.stats);
      setLoading(false);
    };

    fetchAnalytics();
    fetchWebsite();
    fetchEvents();
  }, [publicId, token, startDate, endDate]);

  const trafficChartData = analytics?.trafficOverTime
    ? analytics.trafficOverTime.map((d: any) => ({
      date: d.date,
      pageviews: d.pageviews,
      visitors: d.visitors,
    }))
    : [];



  return (
    <Layout className="flex flex-col gap-5">
      <div className={`flex flex-row items-center ${loading ? 'justify-end' : 'justify-between'}`}>
        {!loading && (
          <div className="flex flex-row items-center gap-2">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start);
                setEndDate(end);
              }}
            />
            {analytics?.realTimeVisitors !== undefined && (
              <span className="ml-2 px-3 py-1 bg-foreground text-copy-light border border-border rounded-full text-sm font-medium">
                <span className="text-primary font-bold mr-1">{analytics.realTimeVisitors}</span> current visitor{analytics.realTimeVisitors !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        <NavLink to={`/account/websites?open=${publicId}`} className=" text-copy-light hover:text-copy duration-200 transition">
          <FontAwesomeIcon icon={faCog} />
        </NavLink>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatCard
          label="Unique Visitors"
          value={analytics?.visitors ?? "-"}
          {...(previousAnalytics && calculateTrend(analytics?.visitors || 0, previousAnalytics.visitors || 0))}
        />
        <StatCard
          label="Pageviews"
          value={analytics?.pageviews ?? "-"}
          {...(previousAnalytics && calculateTrend(analytics?.pageviews || 0, previousAnalytics.pageviews || 0))}
        />
        <StatCard
          label="Sessions"
          value={analytics?.sessions ?? "-"}
          {...(previousAnalytics && calculateTrend(analytics?.sessions || 0, previousAnalytics.sessions || 0))}
        />
        <StatCard
          label="Avg. Visit Duration"
          value={formatDuration(analytics?.avgDuration)}
        />
      </div>

      <div className="bg-foreground border border-border rounded-md p-6">
        <h2 className="font-bold mb-4 text-lg">Traffic Over Time</h2>
        {trafficChartData.length > 0 ? (
          <div className="h-80 **:outline-none! **:ring-0! -mx-2.5">
            <AreaChart
              data={trafficChartData}
              index="date"
              categories={["pageviews", "visitors"]}
              colors={["primary", "secondary"]}
              valueFormatter={(value: number) => value.toString()}
              showLegend={true}
              showTooltip={true}
              showGridLines={true}
              showXAxis={true}
              showYAxis={true}
              yAxisWidth={40}
              fill="gradient"
              selectable={false}
              onValueChange={(value) => {
                console.log("Chart interaction:", value);
              }}
            />
          </div>
        ) : (
          <div className="animate-pulse bg-border rounded-md h-80 w-full" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BreakdownBarList
          title="Top Pages"
          labelKey="page"
          valueKey="pageviews"
          data={analytics?.topPages}
          tableLabel="Pageviews"
        />
        <BreakdownBarList
          title="Top Referrers"
          labelKey="referrer"
          valueKey="visits"
          data={analytics?.topReferrers}
          tableLabel="Visits"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BreakdownBarList
          title="Device Breakdown"
          labelKey="device"
          valueKey="visitors"
          data={analytics?.deviceBreakdown}
          tableLabel="Visitors"
        />
        <BreakdownBarList
          title="Country Breakdown"
          labelKey="country"
          valueKey="visitors"
          data={analytics?.countryBreakdown}
          tableLabel="Visitors"
        />
      </div>
      <BreakdownBarList
        title="Top Events"
        data={events}
        valueKey="count"
        labelKey="eventName"
        tableLabel="Event Count"
      />
      <div className="">
        <RecordingsList websiteId={website?.privateId} token={token} />
      </div>
    </Layout>
  );
};

export default Website;