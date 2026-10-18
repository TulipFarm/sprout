import { useState, type MouseEvent, type ReactNode } from "react";
import { BookOpen } from "reicon-react/icons/BookOpen";
import { CalendarDays } from "reicon-react/icons/CalendarDays";
import { ChartBar } from "reicon-react/icons/ChartBar";
import { FileText } from "reicon-react/icons/FileText";
import { FolderOpen } from "reicon-react/icons/FolderOpen";
import { HelpCircle } from "reicon-react/icons/HelpCircle";
import { Leaf } from "reicon-react/icons/Leaf";
import { Users } from "reicon-react/icons/Users";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  type NavigationMenuProps,
} from "@tulipfarm/sprout/navigation-menu";
import { ToggleGroup, ToggleGroupItem } from "@tulipfarm/sprout/toggle-group";
import "../styles/navigation-menu-demo.css";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

type Align = NonNullable<NavigationMenuProps["align"]>;
const aligns = ["start", "center", "end"] as const;

interface Destination {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}

const projects: Destination[] = [
  {
    href: "#meadow",
    title: "Meadow project",
    description: "Spring planting plan and plot assignments.",
    icon: <Leaf />,
  },
  {
    href: "#garden",
    title: "Garden notes",
    description: "Shared notes from the weekly walk-through.",
    icon: <FileText />,
  },
  {
    href: "#greenhouse",
    title: "Greenhouse irrigation retrofit — north wing",
    description: "Long names wrap inside the panel instead of spilling out.",
    icon: <FolderOpen />,
  },
];

const resources: Destination[] = [
  {
    href: "#guides",
    title: "Planting guides",
    description: "Step-by-step guides for each season.",
    icon: <BookOpen />,
  },
  {
    href: "#calendar",
    title: "Harvest calendar",
    description: "When each crop is ready to pick.",
    icon: <CalendarDays />,
  },
  {
    href: "#reports",
    title: "Yield reports",
    description: "Monthly totals by plot and crop.",
    icon: <ChartBar />,
  },
  {
    href: "#team",
    title: "Team directory",
    description: "Who looks after which beds.",
    icon: <Users />,
  },
];

function useDestination(initial = "Nothing selected.") {
  const [selected, setSelected] = useState(initial);
  /** Sample links stay on this page and report where they would go. */
  const go = (label: string) => (event: MouseEvent) => {
    event.preventDefault();
    setSelected(`Selected locally: ${label}.`);
  };
  return [selected, go] as const;
}

function RichLink({
  item,
  onClick,
  active,
}: {
  item: Destination;
  onClick: (event: MouseEvent) => void;
  active?: boolean;
}) {
  return (
    <NavigationMenuLink
      href={item.href}
      onClick={onClick}
      active={active}
      closeOnClick
      className="nav-demo-rich-link"
    >
      {item.icon}
      <span className="nav-demo-rich-text">
        <span className="nav-demo-rich-title">{item.title}</span>
        <span className="nav-demo-rich-description">{item.description}</span>
      </span>
    </NavigationMenuLink>
  );
}

/* ------------------------------------------------------------------ */
/* Playground: the Cloud composition                                   */
/* ------------------------------------------------------------------ */

export function NavigationMenuPlayground() {
  const [align, setAlign] = useState<Align>("start");
  const [selected, go] = useDestination();
  return (
    <section
      className="nav-demo-playground"
      aria-label="Navigation menu playground"
    >
      <div className="nav-demo-toolbar">
        <span className="nav-demo-caption" id="nav-demo-align-label">
          Panel align
        </span>
        <ToggleGroup
          aria-labelledby="nav-demo-align-label"
          variant="outline"
          size="sm"
          spacing={0}
          value={[align]}
          onValueChange={(value) => value[0] && setAlign(value[0] as Align)}
        >
          {aligns.map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {value}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="nav-demo-stage">
        <NavigationMenu align={align} aria-label="Playground">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Projects</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="nav-demo-simple-panel">
                  <NavigationMenuLink
                    href="#meadow"
                    onClick={go("Meadow project")}
                  >
                    Meadow project
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    href="#garden"
                    onClick={go("Garden notes")}
                  >
                    Garden notes
                  </NavigationMenuLink>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink href="#help" onClick={go("Help")}>
                Help
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <p className="nav-demo-readout" role="status">
        {selected}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Site header: rich panels, active page, indicator, disabled          */
/* ------------------------------------------------------------------ */

export function NavigationMenuSiteHeader() {
  const [selected, go] = useDestination("Current page: Overview.");
  const [current, setCurrent] = useState("Overview");
  const visit = (label: string) => (event: MouseEvent) => {
    go(label)(event);
    setCurrent(label);
  };
  return (
    <section className="nav-demo-card" aria-label="Site header">
      <header className="nav-demo-header">
        <span className="nav-demo-brand" aria-hidden="true">
          <Leaf />
          Meadow
        </span>
        <NavigationMenu aria-label="Site">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="#overview"
                active={current === "Overview"}
                onClick={visit("Overview")}
                className={navigationMenuTriggerStyle()}
              >
                Overview
              </NavigationMenuLink>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Projects</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="nav-demo-list">
                  {projects.map((item) => (
                    <li key={item.href}>
                      <RichLink
                        item={item}
                        active={current === item.title}
                        onClick={visit(item.title)}
                      />
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
              <NavigationMenuIndicator />
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="nav-demo-list nav-demo-grid">
                  {resources.map((item) => (
                    <li key={item.href}>
                      <RichLink
                        item={item}
                        active={current === item.title}
                        onClick={visit(item.title)}
                      />
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
              <NavigationMenuIndicator />
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger disabled>Billing</NavigationMenuTrigger>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuLink
                href="#help"
                active={current === "Help"}
                onClick={visit("Help")}
                className={navigationMenuTriggerStyle()}
              >
                <HelpCircle />
                Help
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </header>
      <p className="nav-demo-readout" role="status">
        {selected}
      </p>
    </section>
  );
}
