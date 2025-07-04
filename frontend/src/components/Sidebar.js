import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav, Collapse } from 'react-bootstrap';

function Sidebar({ isCollapsed }) {
  const [open, setOpen] = useState({}); // State to manage collapse for each submenu

  const navItems = [
    {
      title: "Dashboard",
      path: "/",
      icon: "📊",
    },
    {
      title: "Academics",
      icon: "📚",
      subItems: [
        { title: "GPA Tracker", path: "/gpa" },
        { title: "Study Tracker", path: "/study" },
      ],
    },
    {
      title: "Learning Tools",
      icon: "🧠",
      subItems: [
        { title: "Practice", path: "/practice" },
        { title: "Saved Questions", path: "/saved-questions" },
        { title: "AI Grader", path: "/grader" },
      ],
    },
    {
      title: "Analytics",
      path: "/analytics",
      icon: "📈",
    },
    {
      title: "Settings",
      path: "/settings",
      icon: "⚙️",
    },
  ];

  const handleToggle = (title) => {
    if (!isCollapsed) { // Only allow toggling if sidebar is not collapsed
      setOpen(prevOpen => ({
        ...prevOpen,
        [title]: !prevOpen[title]
      }));
    }
  };

  return (
    <Nav className="flex-column">
      {navItems.map((item, index) => (
        <div key={index}>
          {item.subItems ? (
            <>
              <Nav.Link
                onClick={() => handleToggle(item.title)}
                aria-controls={`collapse-${item.title}`}
                aria-expanded={!isCollapsed && !!open[item.title]} // Ensure boolean
              >
                {item.icon} {!isCollapsed && item.title}
              </Nav.Link>
              <Collapse in={!isCollapsed && !!open[item.title]}>
                <Nav id={`collapse-${item.title}`} className="flex-column ms-3">
                  {item.subItems.map((subItem, subIndex) => (
                    <Nav.Link key={subIndex} as={Link} to={subItem.path}>
                      {subItem.title}
                    </Nav.Link>
                  ))}
                </Nav>
              </Collapse>
            </>
          ) : (
            <Nav.Link as={Link} to={item.path}>
              {item.icon} {!isCollapsed && item.title}
            </Nav.Link>
          )}
        </div>
      ))}
    </Nav>
  );
}

export default Sidebar;