const pool = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Creating tables...');

  await pool.query(`
    DROP TABLE IF EXISTS labor_compliance CASCADE;
    DROP TABLE IF EXISTS swap_requests CASCADE;
    DROP TABLE IF EXISTS incidents CASCADE;
    DROP TABLE IF EXISTS performance_reviews CASCADE;
    DROP TABLE IF EXISTS training CASCADE;
    DROP TABLE IF EXISTS announcements CASCADE;
    DROP TABLE IF EXISTS payroll CASCADE;
    DROP TABLE IF EXISTS demand_forecasts CASCADE;
    DROP TABLE IF EXISTS coverage_plans CASCADE;
    DROP TABLE IF EXISTS availability CASCADE;
    DROP TABLE IF EXISTS time_off_requests CASCADE;
    DROP TABLE IF EXISTS shift_templates CASCADE;
    DROP TABLE IF EXISTS shifts CASCADE;
    DROP TABLE IF EXISTS employees CASCADE;
    DROP TABLE IF EXISTS stores CASCADE;
    DROP TABLE IF EXISTS districts CASCADE;
    DROP TABLE IF EXISTS regions CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  await pool.query(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'manager',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE regions (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(20),
      description TEXT,
      regional_manager VARCHAR(255),
      headquarters_city VARCHAR(255),
      states_covered VARCHAR(255),
      total_stores INTEGER,
      total_employees INTEGER,
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE districts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(20),
      region_name VARCHAR(255),
      district_manager VARCHAR(255),
      city VARCHAR(255),
      state VARCHAR(50),
      total_stores INTEGER,
      total_employees INTEGER,
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE stores (
      id SERIAL PRIMARY KEY,
      store_number VARCHAR(20),
      name VARCHAR(255) NOT NULL,
      district_name VARCHAR(255),
      region_name VARCHAR(255),
      address VARCHAR(500),
      city VARCHAR(255),
      state VARCHAR(50),
      zip VARCHAR(20),
      phone VARCHAR(50),
      store_manager VARCHAR(255),
      square_footage INTEGER,
      open_date DATE,
      status VARCHAR(50) DEFAULT 'Open',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE employees (
      id SERIAL PRIMARY KEY,
      employee_id VARCHAR(20),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      role VARCHAR(100),
      department VARCHAR(100),
      store_name VARCHAR(255),
      district_name VARCHAR(255),
      hire_date DATE,
      hourly_rate DECIMAL(10,2),
      employment_type VARCHAR(50),
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE shifts (
      id SERIAL PRIMARY KEY,
      store_name VARCHAR(255),
      employee_name VARCHAR(255),
      role VARCHAR(100),
      shift_date DATE,
      start_time VARCHAR(20),
      end_time VARCHAR(20),
      hours DECIMAL(5,2),
      break_minutes INTEGER,
      department VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Scheduled',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE shift_templates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      store_name VARCHAR(255),
      department VARCHAR(100),
      start_time VARCHAR(20),
      end_time VARCHAR(20),
      hours DECIMAL(5,2),
      break_minutes INTEGER,
      min_staff INTEGER,
      max_staff INTEGER,
      days_applicable VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE time_off_requests (
      id SERIAL PRIMARY KEY,
      employee_name VARCHAR(255),
      store_name VARCHAR(255),
      request_type VARCHAR(50),
      start_date DATE,
      end_date DATE,
      total_days INTEGER,
      reason TEXT,
      submitted_date DATE,
      approved_by VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE availability (
      id SERIAL PRIMARY KEY,
      employee_name VARCHAR(255),
      store_name VARCHAR(255),
      day_of_week VARCHAR(20),
      available_from VARCHAR(20),
      available_to VARCHAR(20),
      max_hours DECIMAL(5,2),
      preferred_shift VARCHAR(50),
      effective_date DATE,
      expiry_date DATE,
      status VARCHAR(50) DEFAULT 'Active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE coverage_plans (
      id SERIAL PRIMARY KEY,
      store_name VARCHAR(255),
      department VARCHAR(100),
      day_of_week VARCHAR(20),
      time_slot VARCHAR(50),
      min_staff INTEGER,
      optimal_staff INTEGER,
      max_staff INTEGER,
      current_staff INTEGER,
      coverage_pct DECIMAL(5,1),
      status VARCHAR(50) DEFAULT 'Active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE demand_forecasts (
      id SERIAL PRIMARY KEY,
      store_name VARCHAR(255),
      forecast_date DATE,
      department VARCHAR(100),
      predicted_traffic INTEGER,
      predicted_sales DECIMAL(15,2),
      recommended_staff INTEGER,
      confidence_level VARCHAR(50),
      factors TEXT,
      season VARCHAR(50),
      status VARCHAR(50) DEFAULT 'Active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE payroll (
      id SERIAL PRIMARY KEY,
      employee_name VARCHAR(255),
      store_name VARCHAR(255),
      pay_period VARCHAR(50),
      regular_hours DECIMAL(10,2),
      overtime_hours DECIMAL(10,2),
      hourly_rate DECIMAL(10,2),
      regular_pay DECIMAL(15,2),
      overtime_pay DECIMAL(15,2),
      total_pay DECIMAL(15,2),
      deductions DECIMAL(15,2),
      net_pay DECIMAL(15,2),
      status VARCHAR(50) DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE announcements (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255),
      message TEXT,
      target_scope VARCHAR(50),
      target_name VARCHAR(255),
      priority VARCHAR(50),
      author VARCHAR(255),
      publish_date DATE,
      expiry_date DATE,
      category VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE training (
      id SERIAL PRIMARY KEY,
      employee_name VARCHAR(255),
      store_name VARCHAR(255),
      training_name VARCHAR(255),
      category VARCHAR(100),
      required_by DATE,
      completed_date DATE,
      expiry_date DATE,
      score VARCHAR(20),
      instructor VARCHAR(255),
      certification_id VARCHAR(50),
      status VARCHAR(50) DEFAULT 'Assigned',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE performance_reviews (
      id SERIAL PRIMARY KEY,
      employee_name VARCHAR(255),
      store_name VARCHAR(255),
      review_period VARCHAR(50),
      reviewer VARCHAR(255),
      overall_rating VARCHAR(20),
      attendance_score VARCHAR(20),
      productivity_score VARCHAR(20),
      teamwork_score VARCHAR(20),
      goals TEXT,
      strengths TEXT,
      improvements TEXT,
      status VARCHAR(50) DEFAULT 'Draft',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE incidents (
      id SERIAL PRIMARY KEY,
      store_name VARCHAR(255),
      incident_type VARCHAR(100),
      description TEXT,
      severity VARCHAR(50),
      location VARCHAR(255),
      reported_by VARCHAR(255),
      date_reported DATE,
      date_resolved DATE,
      corrective_action TEXT,
      status VARCHAR(50) DEFAULT 'Open',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE swap_requests (
      id SERIAL PRIMARY KEY,
      requester_name VARCHAR(255),
      swap_with_name VARCHAR(255),
      store_name VARCHAR(255),
      original_date DATE,
      original_shift VARCHAR(100),
      swap_date DATE,
      swap_shift VARCHAR(100),
      reason TEXT,
      approved_by VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE labor_compliance (
      id SERIAL PRIMARY KEY,
      store_name VARCHAR(255),
      compliance_type VARCHAR(100),
      regulation VARCHAR(255),
      description TEXT,
      audit_date DATE,
      auditor VARCHAR(255),
      result VARCHAR(50),
      corrective_action TEXT,
      deadline DATE,
      status VARCHAR(50) DEFAULT 'Active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Tables created. Seeding data...');

  // Seed user
  const hash = await bcrypt.hash('password123', 10);
  await pool.query(
    `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)`,
    ['Admin User', 'admin@ihss.com', hash, 'admin']
  );

  // Seed regions (15)
  const regions = [
    ['Southeast', 'SE', 'Southeastern United States territory covering 8 states', 'Robert Mitchell', 'Atlanta, GA', 'GA, FL, SC, NC, AL, TN, MS, VA', 142, 18500, 'Active'],
    ['Northeast', 'NE', 'Northeastern United States covering New England and Mid-Atlantic', 'Patricia Donovan', 'Boston, MA', 'MA, NY, NJ, CT, PA, ME, NH, VT, RI', 168, 22400, 'Active'],
    ['Midwest', 'MW', 'Central United States covering Great Lakes and Plains states', 'Thomas Henderson', 'Chicago, IL', 'IL, OH, MI, IN, WI, MN, IA, MO', 155, 19800, 'Active'],
    ['Southwest', 'SW', 'Southwestern United States including Texas and desert states', 'Maria Rodriguez', 'Dallas, TX', 'TX, AZ, NM, OK, NV', 130, 16200, 'Active'],
    ['West Coast', 'WC', 'Pacific coast states from Washington to California', 'David Chen', 'Los Angeles, CA', 'CA, OR, WA', 175, 24100, 'Active'],
    ['Mountain', 'MT', 'Rocky Mountain region states', 'Jennifer Adams', 'Denver, CO', 'CO, UT, MT, WY, ID', 68, 8400, 'Active'],
    ['South Central', 'SC', 'South central states including Louisiana and Arkansas', 'William Johnson', 'Nashville, TN', 'LA, AR, KY, TN', 72, 9100, 'Active'],
    ['Mid-Atlantic', 'MA', 'Mid-Atlantic states from Delaware to Virginia', 'Karen Williams', 'Philadelphia, PA', 'PA, DE, MD, VA, DC', 95, 12800, 'Active'],
    ['Great Plains', 'GP', 'Great Plains and northern central states', 'James Peterson', 'Kansas City, MO', 'KS, NE, SD, ND', 45, 5200, 'Active'],
    ['Pacific Northwest', 'PNW', 'Pacific Northwest including Alaska', 'Sarah Kim', 'Seattle, WA', 'WA, OR, AK', 58, 7600, 'Active'],
    ['Gulf Coast', 'GC', 'Gulf of Mexico coastal states', 'Michael Brown', 'Houston, TX', 'TX, LA, MS, AL, FL', 110, 13900, 'Active'],
    ['New England', 'NEN', 'New England states territory', 'Elizabeth Murphy', 'Hartford, CT', 'CT, MA, RI, NH, VT, ME', 62, 8100, 'Active'],
    ['Great Lakes', 'GL', 'Great Lakes bordering states', 'Richard Taylor', 'Detroit, MI', 'MI, OH, IN, WI, MN', 88, 11200, 'Active'],
    ['Carolinas', 'CAR', 'North and South Carolina territory', 'Angela Davis', 'Charlotte, NC', 'NC, SC', 78, 9800, 'Active'],
    ['Florida', 'FL', 'Florida state territory - high density market', 'Carlos Martinez', 'Orlando, FL', 'FL', 95, 13200, 'Active'],
  ];
  for (const r of regions) {
    await pool.query(
      `INSERT INTO regions (name,code,description,regional_manager,headquarters_city,states_covered,total_stores,total_employees,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, r
    );
  }

  // Seed districts (15)
  const districts = [
    ['Atlanta Metro', 'SE-ATL', 'Southeast', 'Mike Johnson', 'Atlanta', 'GA', 12, 1560, 'Active'],
    ['South Florida', 'FL-SFL', 'Florida', 'Ana Garcia', 'Miami', 'FL', 15, 2100, 'Active'],
    ['Boston Metro', 'NE-BOS', 'Northeast', 'Tom O\'Brien', 'Boston', 'MA', 10, 1350, 'Active'],
    ['NYC Metro', 'NE-NYC', 'Northeast', 'Lisa Chang', 'New York', 'NY', 18, 2800, 'Active'],
    ['Chicago Metro', 'MW-CHI', 'Midwest', 'Dan Wilson', 'Chicago', 'IL', 14, 1820, 'Active'],
    ['Dallas-Fort Worth', 'SW-DFW', 'Southwest', 'Rosa Hernandez', 'Dallas', 'TX', 16, 2080, 'Active'],
    ['Houston Metro', 'GC-HOU', 'Gulf Coast', 'James Brown', 'Houston', 'TX', 13, 1690, 'Active'],
    ['LA Metro', 'WC-LAX', 'West Coast', 'Kevin Park', 'Los Angeles', 'CA', 20, 2900, 'Active'],
    ['SF Bay Area', 'WC-SFO', 'West Coast', 'Amy Tanaka', 'San Francisco', 'CA', 11, 1540, 'Active'],
    ['Denver Metro', 'MT-DEN', 'Mountain', 'Steve Clark', 'Denver', 'CO', 8, 960, 'Active'],
    ['Seattle Metro', 'PNW-SEA', 'Pacific Northwest', 'Rachel Lee', 'Seattle', 'WA', 9, 1170, 'Active'],
    ['Charlotte Metro', 'CAR-CLT', 'Carolinas', 'Brian White', 'Charlotte', 'NC', 10, 1280, 'Active'],
    ['Phoenix Metro', 'SW-PHX', 'Southwest', 'Maria Santos', 'Phoenix', 'AZ', 11, 1320, 'Active'],
    ['Detroit Metro', 'GL-DET', 'Great Lakes', 'Paul Thompson', 'Detroit', 'MI', 9, 1080, 'Active'],
    ['Nashville Metro', 'SC-NSH', 'South Central', 'Kelly Davis', 'Nashville', 'TN', 7, 840, 'Active'],
  ];
  for (const d of districts) {
    await pool.query(
      `INSERT INTO districts (name,code,region_name,district_manager,city,state,total_stores,total_employees,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, d
    );
  }

  // Seed stores (15)
  const stores = [
    ['1001', 'Atlanta Midtown', 'Atlanta Metro', 'Southeast', '1250 Peachtree St NE', 'Atlanta', 'GA', '30309', '404-555-0101', 'Sarah Mitchell', 112000, '2005-03-15', 'Open'],
    ['1002', 'Atlanta Buckhead', 'Atlanta Metro', 'Southeast', '3500 Peachtree Rd NE', 'Atlanta', 'GA', '30326', '404-555-0102', 'John Davis', 98000, '2008-06-20', 'Open'],
    ['2001', 'Miami Beach', 'South Florida', 'Florida', '1700 Collins Ave', 'Miami Beach', 'FL', '33139', '305-555-0201', 'Carlos Rivera', 105000, '2010-01-10', 'Open'],
    ['3001', 'Boston Cambridge', 'Boston Metro', 'Northeast', '100 CambridgeSide Pl', 'Cambridge', 'MA', '02141', '617-555-0301', 'Emily Walsh', 88000, '2003-09-05', 'Open'],
    ['3501', 'Manhattan East', 'NYC Metro', 'Northeast', '540 E 14th St', 'New York', 'NY', '10009', '212-555-0351', 'Wei Zhang', 75000, '2012-04-18', 'Open'],
    ['4001', 'Chicago Lincoln Park', 'Chicago Metro', 'Midwest', '2700 N Clybourn Ave', 'Chicago', 'IL', '60614', '312-555-0401', 'Amanda Nelson', 120000, '2001-11-30', 'Open'],
    ['5001', 'Dallas Plano', 'Dallas-Fort Worth', 'Southwest', '8000 Coit Rd', 'Plano', 'TX', '75025', '972-555-0501', 'Miguel Sanchez', 135000, '2006-08-12', 'Open'],
    ['5501', 'Houston Galleria', 'Houston Metro', 'Gulf Coast', '5015 Westheimer Rd', 'Houston', 'TX', '77056', '713-555-0551', 'Karen White', 142000, '2004-02-28', 'Open'],
    ['6001', 'LA Hollywood', 'LA Metro', 'West Coast', '5600 Sunset Blvd', 'Los Angeles', 'CA', '90028', '323-555-0601', 'Jason Kim', 95000, '2011-07-04', 'Open'],
    ['6501', 'SF Mission Bay', 'SF Bay Area', 'West Coast', '800 Mission Bay Blvd', 'San Francisco', 'CA', '94158', '415-555-0651', 'Diana Chen', 82000, '2015-03-22', 'Open'],
    ['7001', 'Denver Highlands', 'Denver Metro', 'Mountain', '3200 Lowell Blvd', 'Denver', 'CO', '80211', '303-555-0701', 'Ryan Torres', 108000, '2009-10-15', 'Open'],
    ['7501', 'Seattle Capitol Hill', 'Seattle Metro', 'Pacific Northwest', '1620 Broadway', 'Seattle', 'WA', '98122', '206-555-0751', 'Nicole Tanaka', 78000, '2013-05-08', 'Open'],
    ['8001', 'Charlotte Uptown', 'Charlotte Metro', 'Carolinas', '301 S Tryon St', 'Charlotte', 'NC', '28202', '704-555-0801', 'Marcus Brown', 115000, '2007-12-01', 'Open'],
    ['8501', 'Phoenix Scottsdale', 'Phoenix Metro', 'Southwest', '7014 E Camelback Rd', 'Scottsdale', 'AZ', '85251', '480-555-0851', 'Jennifer Lopez', 125000, '2010-09-20', 'Open'],
    ['9001', 'Detroit Troy', 'Detroit Metro', 'Great Lakes', '500 W Big Beaver Rd', 'Troy', 'MI', '48084', '248-555-0901', 'David Armstrong', 100000, '2002-06-15', 'Open'],
  ];
  for (const s of stores) {
    await pool.query(
      `INSERT INTO stores (store_number,name,district_name,region_name,address,city,state,zip,phone,store_manager,square_footage,open_date,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, s
    );
  }

  // Seed employees (15)
  const employees = [
    ['EMP-1001', 'John', 'Martinez', 'jmartinez@ihss.com', '404-555-1001', 'Sales Associate', 'Sales Floor', 'Atlanta Midtown', 'Atlanta Metro', '2020-03-15', 16.50, 'Full-Time', 'Active'],
    ['EMP-1002', 'Emily', 'Johnson', 'ejohnson@ihss.com', '404-555-1002', 'Cashier', 'Front End', 'Atlanta Midtown', 'Atlanta Metro', '2021-06-01', 15.00, 'Full-Time', 'Active'],
    ['EMP-1003', 'Marcus', 'Williams', 'mwilliams@ihss.com', '404-555-1003', 'Department Lead', 'Lumber', 'Atlanta Buckhead', 'Atlanta Metro', '2018-09-20', 22.00, 'Full-Time', 'Active'],
    ['EMP-2001', 'Ana', 'Rodriguez', 'arodriguez@ihss.com', '305-555-2001', 'Sales Specialist', 'Appliances', 'Miami Beach', 'South Florida', '2019-01-10', 18.50, 'Full-Time', 'Active'],
    ['EMP-3001', 'Sean', 'O\'Brien', 'sobrien@ihss.com', '617-555-3001', 'Inventory Specialist', 'Receiving', 'Boston Cambridge', 'Boston Metro', '2020-11-15', 17.00, 'Full-Time', 'Active'],
    ['EMP-3501', 'Mei', 'Zhang', 'mzhang@ihss.com', '212-555-3501', 'Sales Associate', 'Paint', 'Manhattan East', 'NYC Metro', '2022-04-01', 17.50, 'Part-Time', 'Active'],
    ['EMP-4001', 'Tyler', 'Nelson', 'tnelson@ihss.com', '312-555-4001', 'Shift Lead', 'Store Operations', 'Chicago Lincoln Park', 'Chicago Metro', '2017-08-12', 24.00, 'Full-Time', 'Active'],
    ['EMP-5001', 'Rosa', 'Hernandez', 'rhernandez@ihss.com', '972-555-5001', 'Pro Sales Specialist', 'Pro Desk', 'Dallas Plano', 'Dallas-Fort Worth', '2019-05-20', 21.00, 'Full-Time', 'Active'],
    ['EMP-5501', 'Derek', 'White', 'dwhite@ihss.com', '713-555-5501', 'Overnight Stocker', 'Overnight', 'Houston Galleria', 'Houston Metro', '2021-02-28', 16.00, 'Full-Time', 'Active'],
    ['EMP-6001', 'Kenji', 'Tanaka', 'ktanaka@ihss.com', '323-555-6001', 'Sales Associate', 'Garden Center', 'LA Hollywood', 'LA Metro', '2020-07-04', 17.00, 'Full-Time', 'Active'],
    ['EMP-6501', 'Sarah', 'Chen', 'schen@ihss.com', '415-555-6501', 'Customer Service Lead', 'Service Desk', 'SF Mission Bay', 'SF Bay Area', '2018-03-22', 20.50, 'Full-Time', 'Active'],
    ['EMP-7001', 'Brandon', 'Torres', 'btorres@ihss.com', '303-555-7001', 'Sales Associate', 'Electrical', 'Denver Highlands', 'Denver Metro', '2021-10-15', 16.50, 'Part-Time', 'Active'],
    ['EMP-7501', 'Yuki', 'Sato', 'ysato@ihss.com', '206-555-7501', 'Flooring Specialist', 'Flooring', 'Seattle Capitol Hill', 'Seattle Metro', '2019-05-08', 19.00, 'Full-Time', 'Active'],
    ['EMP-8001', 'Jasmine', 'Brown', 'jbrown@ihss.com', '704-555-8001', 'Cashier', 'Front End', 'Charlotte Uptown', 'Charlotte Metro', '2022-12-01', 15.00, 'Part-Time', 'Active'],
    ['EMP-9001', 'Mike', 'Armstrong', 'marmstrong@ihss.com', '248-555-9001', 'Department Lead', 'Plumbing', 'Detroit Troy', 'Detroit Metro', '2016-06-15', 23.50, 'Full-Time', 'Active'],
  ];
  for (const e of employees) {
    await pool.query(
      `INSERT INTO employees (employee_id,first_name,last_name,email,phone,role,department,store_name,district_name,hire_date,hourly_rate,employment_type,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, e
    );
  }

  // Seed shifts (15)
  const shifts = [
    ['Atlanta Midtown', 'John Martinez', 'Sales Associate', '2024-08-05', '06:00', '14:30', 8, 30, 'Sales Floor', 'Completed', 'Morning shift coverage'],
    ['Atlanta Midtown', 'Emily Johnson', 'Cashier', '2024-08-05', '10:00', '18:30', 8, 30, 'Front End', 'Completed', 'Mid-day register coverage'],
    ['Atlanta Midtown', 'John Martinez', 'Sales Associate', '2024-08-06', '06:00', '14:30', 8, 30, 'Sales Floor', 'Completed', 'Truck day - extra unloading'],
    ['Atlanta Buckhead', 'Marcus Williams', 'Department Lead', '2024-08-05', '05:00', '13:30', 8, 30, 'Lumber', 'Completed', 'Lumber delivery day'],
    ['Miami Beach', 'Ana Rodriguez', 'Sales Specialist', '2024-08-05', '09:00', '17:30', 8, 30, 'Appliances', 'Completed', 'Appliance sale event'],
    ['Boston Cambridge', 'Sean O\'Brien', 'Inventory Specialist', '2024-08-05', '04:00', '12:30', 8, 30, 'Receiving', 'Completed', 'Early receiving shift'],
    ['Manhattan East', 'Mei Zhang', 'Sales Associate', '2024-08-05', '12:00', '18:00', 6, 0, 'Paint', 'Completed', 'Part-time afternoon shift'],
    ['Chicago Lincoln Park', 'Tyler Nelson', 'Shift Lead', '2024-08-05', '06:00', '14:30', 8, 30, 'Store Operations', 'Completed', 'Opening shift lead'],
    ['Dallas Plano', 'Rosa Hernandez', 'Pro Sales Specialist', '2024-08-05', '07:00', '15:30', 8, 30, 'Pro Desk', 'Completed', 'Pro customer appointments'],
    ['Houston Galleria', 'Derek White', 'Overnight Stocker', '2024-08-05', '21:00', '05:30', 8, 30, 'Overnight', 'Completed', 'Reset aisle 12-15'],
    ['LA Hollywood', 'Kenji Tanaka', 'Sales Associate', '2024-08-05', '08:00', '16:30', 8, 30, 'Garden Center', 'Completed', 'Garden center spring rush'],
    ['SF Mission Bay', 'Sarah Chen', 'Customer Service Lead', '2024-08-05', '07:00', '15:30', 8, 30, 'Service Desk', 'Completed', 'Returns and exchanges'],
    ['Denver Highlands', 'Brandon Torres', 'Sales Associate', '2024-08-05', '14:00', '20:00', 6, 0, 'Electrical', 'Completed', 'Part-time evening shift'],
    ['Seattle Capitol Hill', 'Yuki Sato', 'Flooring Specialist', '2024-08-05', '09:00', '17:30', 8, 30, 'Flooring', 'Scheduled', 'Customer measure appointments'],
    ['Detroit Troy', 'Mike Armstrong', 'Department Lead', '2024-08-05', '06:00', '14:30', 8, 30, 'Plumbing', 'Scheduled', 'Plumbing remodel day'],
  ];
  for (const s of shifts) {
    await pool.query(
      `INSERT INTO shifts (store_name,employee_name,role,shift_date,start_time,end_time,hours,break_minutes,department,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, s
    );
  }

  // Seed shift_templates (15)
  const templates = [
    ['Morning Opener', 'Atlanta Midtown', 'Sales Floor', '06:00', '14:30', 8, 30, 3, 5, 'Mon-Sun', 'Active', 'Standard morning coverage'],
    ['Mid-Day', 'Atlanta Midtown', 'Sales Floor', '10:00', '18:30', 8, 30, 4, 6, 'Mon-Sun', 'Active', 'Peak traffic coverage'],
    ['Evening Closer', 'Atlanta Midtown', 'Sales Floor', '14:00', '22:00', 8, 30, 3, 5, 'Mon-Sun', 'Active', 'Evening closing shift'],
    ['Cashier AM', 'Atlanta Midtown', 'Front End', '06:00', '14:30', 8, 30, 2, 4, 'Mon-Fri', 'Active', 'Weekday morning registers'],
    ['Cashier Weekend', 'Atlanta Midtown', 'Front End', '08:00', '16:30', 8, 30, 4, 8, 'Sat-Sun', 'Active', 'Weekend peak registers'],
    ['Receiving Early', 'Boston Cambridge', 'Receiving', '04:00', '12:30', 8, 30, 2, 3, 'Mon,Wed,Fri', 'Active', 'Truck delivery days'],
    ['Overnight Stock', 'Houston Galleria', 'Overnight', '21:00', '05:30', 8, 30, 4, 6, 'Sun-Thu', 'Active', 'Overnight replenishment'],
    ['Pro Desk', 'Dallas Plano', 'Pro Desk', '07:00', '15:30', 8, 30, 2, 3, 'Mon-Fri', 'Active', 'Pro customer hours'],
    ['Garden Center', 'LA Hollywood', 'Garden Center', '08:00', '16:30', 8, 30, 3, 5, 'Mon-Sun', 'Active', 'Full garden coverage'],
    ['Service Desk', 'SF Mission Bay', 'Service Desk', '07:00', '15:30', 8, 30, 2, 3, 'Mon-Sun', 'Active', 'Service desk coverage'],
    ['Part-Time Evening', 'Denver Highlands', 'Electrical', '14:00', '20:00', 6, 0, 1, 2, 'Mon-Fri', 'Active', 'Part-timer evening help'],
    ['Specialist', 'Seattle Capitol Hill', 'Flooring', '09:00', '17:30', 8, 30, 1, 2, 'Mon-Sat', 'Active', 'Specialist appointments'],
    ['Lumber Open', 'Atlanta Buckhead', 'Lumber', '05:00', '13:30', 8, 30, 2, 4, 'Mon-Sat', 'Active', 'Early lumber customers'],
    ['Holiday Extended', 'Chicago Lincoln Park', 'Store Operations', '06:00', '23:00', 8, 30, 8, 15, 'Mon-Sun', 'Active', 'Holiday season template'],
    ['Training Shift', 'Manhattan East', 'Paint', '09:00', '15:00', 6, 30, 1, 2, 'Tue,Thu', 'Active', 'New hire training hours'],
  ];
  for (const t of templates) {
    await pool.query(
      `INSERT INTO shift_templates (name,store_name,department,start_time,end_time,hours,break_minutes,min_staff,max_staff,days_applicable,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, t
    );
  }

  // Seed time_off_requests (15)
  const timeOff = [
    ['John Martinez', 'Atlanta Midtown', 'Vacation', '2024-08-19', '2024-08-23', 5, 'Family vacation to Florida', '2024-07-15', 'Sarah Mitchell', 'Approved', 'Coverage arranged with backup'],
    ['Emily Johnson', 'Atlanta Midtown', 'Sick Leave', '2024-08-12', '2024-08-12', 1, 'Not feeling well, flu symptoms', '2024-08-12', 'Sarah Mitchell', 'Approved', 'Same-day call out'],
    ['Marcus Williams', 'Atlanta Buckhead', 'Personal', '2024-08-15', '2024-08-16', 2, 'Moving to new apartment', '2024-08-01', 'John Davis', 'Approved', 'Scheduled during slow period'],
    ['Ana Rodriguez', 'Miami Beach', 'Vacation', '2024-09-02', '2024-09-13', 10, 'International travel to visit family', '2024-07-20', 'Carlos Rivera', 'Approved', 'Long trip - coverage critical'],
    ['Sean O\'Brien', 'Boston Cambridge', 'Jury Duty', '2024-08-26', '2024-08-30', 5, 'Summoned for jury duty', '2024-08-10', 'Emily Walsh', 'Approved', 'Legal obligation'],
    ['Mei Zhang', 'Manhattan East', 'Personal', '2024-08-20', '2024-08-20', 1, 'Doctor appointment', '2024-08-14', 'Wei Zhang', 'Approved', 'Afternoon appointment'],
    ['Tyler Nelson', 'Chicago Lincoln Park', 'Vacation', '2024-09-16', '2024-09-20', 5, 'Wedding anniversary trip', '2024-08-01', 'Amanda Nelson', 'Pending', 'Awaiting coverage confirmation'],
    ['Rosa Hernandez', 'Dallas Plano', 'Bereavement', '2024-08-08', '2024-08-12', 3, 'Family bereavement leave', '2024-08-08', 'Miguel Sanchez', 'Approved', 'Immediate approval per policy'],
    ['Derek White', 'Houston Galleria', 'Sick Leave', '2024-08-14', '2024-08-15', 2, 'Back injury, doctor ordered rest', '2024-08-14', 'Karen White', 'Approved', 'Workers comp claim filed'],
    ['Kenji Tanaka', 'LA Hollywood', 'Vacation', '2024-08-26', '2024-08-30', 5, 'Summer vacation', '2024-07-25', 'Jason Kim', 'Approved', 'Garden center extra hire to cover'],
    ['Sarah Chen', 'SF Mission Bay', 'Personal', '2024-09-05', '2024-09-06', 2, 'Family event out of state', '2024-08-20', 'Diana Chen', 'Pending', 'Partial holiday coverage needed'],
    ['Brandon Torres', 'Denver Highlands', 'School', '2024-08-29', '2024-08-29', 1, 'College orientation day', '2024-08-15', 'Ryan Torres', 'Approved', 'Part-time student employee'],
    ['Yuki Sato', 'Seattle Capitol Hill', 'Vacation', '2024-10-07', '2024-10-18', 10, 'Trip to Japan to visit family', '2024-08-01', 'Nicole Tanaka', 'Pending', 'Advance booking required'],
    ['Jasmine Brown', 'Charlotte Uptown', 'Sick Leave', '2024-08-16', '2024-08-16', 1, 'Migraine, unable to work', '2024-08-16', 'Marcus Brown', 'Approved', 'Called in morning of shift'],
    ['Mike Armstrong', 'Detroit Troy', 'Vacation', '2024-09-09', '2024-09-13', 5, 'Deer hunting season opener', '2024-08-05', 'David Armstrong', 'Approved', 'Annual tradition'],
  ];
  for (const t of timeOff) {
    await pool.query(
      `INSERT INTO time_off_requests (employee_name,store_name,request_type,start_date,end_date,total_days,reason,submitted_date,approved_by,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, t
    );
  }

  // Seed availability (15)
  const avail = [
    ['John Martinez', 'Atlanta Midtown', 'Monday', '06:00', '22:00', 8, 'Morning', '2024-01-01', '2024-12-31', 'Active', 'Prefers early shifts'],
    ['John Martinez', 'Atlanta Midtown', 'Tuesday', '06:00', '22:00', 8, 'Morning', '2024-01-01', '2024-12-31', 'Active', 'Prefers early shifts'],
    ['Emily Johnson', 'Atlanta Midtown', 'Monday', '10:00', '22:00', 8, 'Mid-Day', '2024-01-01', '2024-12-31', 'Active', 'School drop-off in AM'],
    ['Emily Johnson', 'Atlanta Midtown', 'Saturday', '08:00', '18:00', 8, 'Morning', '2024-01-01', '2024-12-31', 'Active', 'Full availability weekends'],
    ['Mei Zhang', 'Manhattan East', 'Monday', '12:00', '20:00', 6, 'Afternoon', '2024-01-01', '2024-12-31', 'Active', 'College classes in AM'],
    ['Mei Zhang', 'Manhattan East', 'Wednesday', '12:00', '20:00', 6, 'Afternoon', '2024-01-01', '2024-12-31', 'Active', 'College classes in AM'],
    ['Tyler Nelson', 'Chicago Lincoln Park', 'Monday', '05:00', '22:00', 8, 'Any', '2024-01-01', '2024-12-31', 'Active', 'Full availability as shift lead'],
    ['Derek White', 'Houston Galleria', 'Sunday', '21:00', '05:30', 8, 'Overnight', '2024-01-01', '2024-12-31', 'Active', 'Overnight only'],
    ['Derek White', 'Houston Galleria', 'Monday', '21:00', '05:30', 8, 'Overnight', '2024-01-01', '2024-12-31', 'Active', 'Overnight only'],
    ['Brandon Torres', 'Denver Highlands', 'Monday', '14:00', '20:00', 6, 'Evening', '2024-01-01', '2024-12-31', 'Active', 'After college classes'],
    ['Brandon Torres', 'Denver Highlands', 'Saturday', '08:00', '20:00', 8, 'Any', '2024-01-01', '2024-12-31', 'Active', 'Full day available weekends'],
    ['Jasmine Brown', 'Charlotte Uptown', 'Friday', '10:00', '18:00', 6, 'Mid-Day', '2024-01-01', '2024-12-31', 'Active', 'Part-time Fri-Sun'],
    ['Jasmine Brown', 'Charlotte Uptown', 'Saturday', '08:00', '18:00', 8, 'Any', '2024-01-01', '2024-12-31', 'Active', 'Part-time Fri-Sun'],
    ['Sarah Chen', 'SF Mission Bay', 'Monday', '06:00', '22:00', 8, 'Morning', '2024-01-01', '2024-12-31', 'Active', 'Flexible full-time'],
    ['Mike Armstrong', 'Detroit Troy', 'Monday', '05:00', '16:00', 8, 'Morning', '2024-01-01', '2024-12-31', 'Active', 'Early riser, no evenings'],
  ];
  for (const a of avail) {
    await pool.query(
      `INSERT INTO availability (employee_name,store_name,day_of_week,available_from,available_to,max_hours,preferred_shift,effective_date,expiry_date,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, a
    );
  }

  // Seed coverage_plans (15)
  const coverage = [
    ['Atlanta Midtown', 'Sales Floor', 'Monday', '06:00-10:00', 3, 4, 5, 3, 75.0, 'Active', 'Low traffic early morning'],
    ['Atlanta Midtown', 'Sales Floor', 'Monday', '10:00-14:00', 5, 7, 8, 6, 85.7, 'Active', 'Peak morning traffic'],
    ['Atlanta Midtown', 'Sales Floor', 'Saturday', '10:00-14:00', 6, 8, 10, 8, 100.0, 'Active', 'Weekend peak'],
    ['Atlanta Midtown', 'Front End', 'Monday', '10:00-14:00', 3, 4, 6, 3, 75.0, 'Understaffed', 'Need additional cashier'],
    ['Atlanta Midtown', 'Front End', 'Saturday', '10:00-18:00', 4, 6, 8, 7, 116.7, 'Active', 'Weekend extra coverage'],
    ['Miami Beach', 'Appliances', 'Monday', '09:00-17:00', 2, 3, 4, 3, 100.0, 'Active', 'Specialist coverage'],
    ['Boston Cambridge', 'Receiving', 'Monday', '04:00-12:00', 2, 3, 4, 2, 66.7, 'Understaffed', 'Truck day needs more help'],
    ['Chicago Lincoln Park', 'Store Operations', 'Monday', '06:00-22:00', 2, 3, 4, 3, 100.0, 'Active', 'Shift lead coverage all day'],
    ['Dallas Plano', 'Pro Desk', 'Monday', '07:00-16:00', 2, 3, 4, 2, 66.7, 'Understaffed', 'Pro customers morning rush'],
    ['Houston Galleria', 'Overnight', 'Sunday', '21:00-05:00', 4, 5, 6, 4, 80.0, 'Active', 'Sunday night reset'],
    ['LA Hollywood', 'Garden Center', 'Saturday', '08:00-17:00', 4, 5, 6, 5, 100.0, 'Active', 'Weekend garden peak'],
    ['SF Mission Bay', 'Service Desk', 'Monday', '07:00-22:00', 2, 3, 3, 2, 66.7, 'Understaffed', 'Returns spike Mondays'],
    ['Denver Highlands', 'Electrical', 'Wednesday', '14:00-20:00', 1, 2, 3, 1, 50.0, 'Critical', 'Only part-timer available'],
    ['Seattle Capitol Hill', 'Flooring', 'Saturday', '09:00-18:00', 2, 2, 3, 2, 100.0, 'Active', 'Weekend appointment slots full'],
    ['Detroit Troy', 'Plumbing', 'Monday', '06:00-14:00', 2, 3, 4, 3, 100.0, 'Active', 'Pro plumber morning traffic'],
  ];
  for (const c of coverage) {
    await pool.query(
      `INSERT INTO coverage_plans (store_name,department,day_of_week,time_slot,min_staff,optimal_staff,max_staff,current_staff,coverage_pct,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, c
    );
  }

  // Seed demand_forecasts (15)
  const forecasts = [
    ['Atlanta Midtown', '2024-08-10', 'Sales Floor', 1200, 85000, 12, 'High', 'Back-to-school season, Saturday peak', 'Summer', 'Active', 'Historical traffic +15% YoY'],
    ['Atlanta Midtown', '2024-08-11', 'Sales Floor', 950, 68000, 10, 'High', 'Sunday slightly lower than Saturday', 'Summer', 'Active', 'Reduced hours Sunday'],
    ['Atlanta Midtown', '2024-08-12', 'Sales Floor', 600, 42000, 7, 'Medium', 'Typical Monday traffic', 'Summer', 'Active', 'Pro customers morning heavy'],
    ['Miami Beach', '2024-08-10', 'Appliances', 800, 125000, 8, 'Medium', 'Hurricane season prep buying', 'Summer', 'Active', 'Generator demand high'],
    ['Boston Cambridge', '2024-08-10', 'Receiving', 200, 15000, 4, 'High', 'Weekend truck arrival', 'Summer', 'Active', 'Double truck day'],
    ['Chicago Lincoln Park', '2024-08-10', 'Store Operations', 1500, 110000, 15, 'High', 'Back-to-school + summer projects peak', 'Summer', 'Active', 'Highest traffic store'],
    ['Dallas Plano', '2024-08-10', 'Pro Desk', 350, 95000, 5, 'Medium', 'Pro contractor weekend pickup', 'Summer', 'Active', 'Large orders expected'],
    ['Houston Galleria', '2024-08-10', 'Overnight', 50, 0, 5, 'High', 'Major reset planned', 'Summer', 'Active', 'Seasonal endcap changes'],
    ['LA Hollywood', '2024-08-10', 'Garden Center', 900, 45000, 8, 'High', 'Late summer planting season', 'Summer', 'Active', 'Fall plant arrivals'],
    ['SF Mission Bay', '2024-08-10', 'Service Desk', 400, 8000, 4, 'Medium', 'Weekend returns volume', 'Summer', 'Active', 'Post-project returns spike'],
    ['Denver Highlands', '2024-08-10', 'Electrical', 300, 22000, 3, 'Low', 'Average Saturday electrical', 'Summer', 'Active', 'No special events'],
    ['Seattle Capitol Hill', '2024-08-10', 'Flooring', 250, 65000, 3, 'Medium', 'Flooring appointments booked', 'Summer', 'Active', '6 measure appointments'],
    ['Charlotte Uptown', '2024-08-10', 'Front End', 1100, 78000, 8, 'High', 'Weekend peak checkout lines', 'Summer', 'Active', 'Self-checkout high usage'],
    ['Phoenix Scottsdale', '2024-08-10', 'Sales Floor', 700, 52000, 8, 'Medium', 'Summer heat reduces foot traffic', 'Summer', 'Active', 'AC-related products spike'],
    ['Detroit Troy', '2024-08-10', 'Plumbing', 400, 32000, 4, 'Medium', 'Weekend DIY plumbing projects', 'Summer', 'Active', 'Bathroom remodel season'],
  ];
  for (const f of forecasts) {
    await pool.query(
      `INSERT INTO demand_forecasts (store_name,forecast_date,department,predicted_traffic,predicted_sales,recommended_staff,confidence_level,factors,season,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, f
    );
  }

  // Seed payroll (15)
  const payroll = [
    ['John Martinez', 'Atlanta Midtown', 'Aug 1-15 2024', 72, 4, 16.50, 1188.00, 99.00, 1287.00, 321.75, 965.25, 'Processed'],
    ['Emily Johnson', 'Atlanta Midtown', 'Aug 1-15 2024', 76, 0, 15.00, 1140.00, 0, 1140.00, 285.00, 855.00, 'Processed'],
    ['Marcus Williams', 'Atlanta Buckhead', 'Aug 1-15 2024', 80, 6, 22.00, 1760.00, 198.00, 1958.00, 489.50, 1468.50, 'Processed'],
    ['Ana Rodriguez', 'Miami Beach', 'Aug 1-15 2024', 80, 2, 18.50, 1480.00, 55.50, 1535.50, 383.88, 1151.62, 'Processed'],
    ['Sean O\'Brien', 'Boston Cambridge', 'Aug 1-15 2024', 80, 8, 17.00, 1360.00, 204.00, 1564.00, 391.00, 1173.00, 'Processed'],
    ['Mei Zhang', 'Manhattan East', 'Aug 1-15 2024', 48, 0, 17.50, 840.00, 0, 840.00, 210.00, 630.00, 'Processed'],
    ['Tyler Nelson', 'Chicago Lincoln Park', 'Aug 1-15 2024', 80, 10, 24.00, 1920.00, 360.00, 2280.00, 570.00, 1710.00, 'Processed'],
    ['Rosa Hernandez', 'Dallas Plano', 'Aug 1-15 2024', 76, 0, 21.00, 1596.00, 0, 1596.00, 399.00, 1197.00, 'Processed'],
    ['Derek White', 'Houston Galleria', 'Aug 1-15 2024', 80, 4, 16.00, 1280.00, 96.00, 1376.00, 344.00, 1032.00, 'Processed'],
    ['Kenji Tanaka', 'LA Hollywood', 'Aug 1-15 2024', 80, 0, 17.00, 1360.00, 0, 1360.00, 340.00, 1020.00, 'Processed'],
    ['Sarah Chen', 'SF Mission Bay', 'Aug 1-15 2024', 80, 3, 20.50, 1640.00, 92.25, 1732.25, 433.06, 1299.19, 'Processed'],
    ['Brandon Torres', 'Denver Highlands', 'Aug 1-15 2024', 42, 0, 16.50, 693.00, 0, 693.00, 173.25, 519.75, 'Processed'],
    ['Yuki Sato', 'Seattle Capitol Hill', 'Aug 1-15 2024', 80, 2, 19.00, 1520.00, 57.00, 1577.00, 394.25, 1182.75, 'Processed'],
    ['Jasmine Brown', 'Charlotte Uptown', 'Aug 1-15 2024', 36, 0, 15.00, 540.00, 0, 540.00, 135.00, 405.00, 'Processed'],
    ['Mike Armstrong', 'Detroit Troy', 'Aug 1-15 2024', 80, 5, 23.50, 1880.00, 176.25, 2056.25, 514.06, 1542.19, 'Processed'],
  ];
  for (const p of payroll) {
    await pool.query(
      `INSERT INTO payroll (employee_name,store_name,pay_period,regular_hours,overtime_hours,hourly_rate,regular_pay,overtime_pay,total_pay,deductions,net_pay,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, p
    );
  }

  // Seed announcements (15)
  const announcements = [
    ['Back-to-School Staffing Push', 'All stores need to maximize scheduling for back-to-school season Aug 1-Sep 5. Overtime approved for key departments.', 'Company', 'All Regions', 'High', 'Corporate HR', '2024-07-25', '2024-09-05', 'Staffing', 'Active', 'Budget approved for additional hours'],
    ['New POS System Training', 'All front-end employees must complete new POS training by Aug 15. Online module available in LMS.', 'Company', 'All Regions', 'Critical', 'IT Department', '2024-08-01', '2024-08-15', 'Training', 'Active', 'Mandatory completion'],
    ['Southeast Hurricane Preparedness', 'All SE region stores review hurricane prep procedures. Generator stock verified.', 'Region', 'Southeast', 'High', 'Robert Mitchell', '2024-08-01', '2024-11-30', 'Safety', 'Active', 'Hurricane season active'],
    ['Atlanta Metro Holiday Hiring', 'Begin seasonal hiring for Atlanta Metro. Target: 50 additional part-time associates.', 'District', 'Atlanta Metro', 'Medium', 'Mike Johnson', '2024-09-01', '2024-10-15', 'Hiring', 'Active', 'Job fair scheduled Sep 15'],
    ['Chicago Store Renovation', 'Lincoln Park store renovation Phase 1 begins Aug 20. Adjusted scheduling needed.', 'Store', 'Chicago Lincoln Park', 'High', 'Amanda Nelson', '2024-08-10', '2024-10-01', 'Operations', 'Active', 'Night crew to handle rearranging'],
    ['New Overtime Policy', 'Effective Sep 1: All overtime must be pre-approved by district manager. No exceptions.', 'Company', 'All Regions', 'Critical', 'VP Operations', '2024-08-15', '2024-12-31', 'Policy', 'Active', 'Cost control measure'],
    ['Employee Appreciation Week', 'Sep 9-13 is Employee Appreciation Week. Free lunch daily, gift cards for top performers.', 'Company', 'All Regions', 'Medium', 'Corporate HR', '2024-08-20', '2024-09-13', 'Morale', 'Active', 'Budget: $50 per employee'],
    ['West Coast Scheduling Update', 'New predictive scheduling compliance for CA, OR, WA stores. See updated SOPs.', 'Region', 'West Coast', 'Critical', 'David Chen', '2024-08-01', '2024-12-31', 'Compliance', 'Active', 'Legal requirement'],
    ['Dallas Plano Grand Reset', 'Store #5001 full department reset Aug 24-25. All-hands overnight shifts.', 'Store', 'Dallas Plano', 'High', 'Miguel Sanchez', '2024-08-15', '2024-08-25', 'Operations', 'Active', 'Volunteer overtime available'],
    ['New Employee App Launch', 'MySchedule mobile app launching Sep 1. Employees can view shifts, swap, request time off.', 'Company', 'All Regions', 'Medium', 'IT Department', '2024-08-25', '2024-10-01', 'Technology', 'Active', 'Download instructions to follow'],
    ['Florida Stores Extended Hours', 'All Florida stores extending hours to 10pm for hurricane prep season.', 'Region', 'Florida', 'High', 'Carlos Martinez', '2024-08-01', '2024-11-30', 'Operations', 'Active', 'Additional staffing budget approved'],
    ['Safety Stand-Down Week', 'All stores: Safety stand-down Aug 26-30. Daily 15-min safety meetings required.', 'Company', 'All Regions', 'Critical', 'Safety Director', '2024-08-20', '2024-08-30', 'Safety', 'Active', 'OSHA partnership initiative'],
    ['Seattle New Store Opening', 'Bellevue store opening Oct 1. Transfer opportunities available for Seattle district.', 'District', 'Seattle Metro', 'Medium', 'Rachel Lee', '2024-08-15', '2024-10-01', 'Hiring', 'Active', 'Higher pay for opening crew'],
    ['Inventory Count Schedule', 'Annual inventory counts: Atlanta stores Sep 20, Chicago stores Sep 27.', 'Region', 'Southeast', 'High', 'Operations Team', '2024-09-01', '2024-09-30', 'Operations', 'Active', 'Overnight crew needed'],
    ['Benefits Open Enrollment', 'Open enrollment Oct 1-31. Benefits fair at each store week of Oct 7.', 'Company', 'All Regions', 'Medium', 'HR Benefits', '2024-09-15', '2024-10-31', 'HR', 'Active', 'New dental plan option added'],
  ];
  for (const a of announcements) {
    await pool.query(
      `INSERT INTO announcements (title,message,target_scope,target_name,priority,author,publish_date,expiry_date,category,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, a
    );
  }

  // Seed training (15)
  const training = [
    ['John Martinez', 'Atlanta Midtown', 'Forklift Certification', 'Safety', '2024-09-01', '2024-08-10', '2025-08-10', '95%', 'Safety Trainer Jim', 'CERT-FL-1001', 'Completed', 'Passed on first attempt'],
    ['Emily Johnson', 'Atlanta Midtown', 'POS System Training', 'Technology', '2024-08-15', '2024-08-12', null, '100%', 'Online LMS', 'CERT-POS-1002', 'Completed', 'Completed early'],
    ['Marcus Williams', 'Atlanta Buckhead', 'Department Lead Certification', 'Leadership', '2024-07-01', '2024-06-28', '2026-06-28', '88%', 'Regional Trainer', 'CERT-DL-1003', 'Completed', 'Two year certification'],
    ['Ana Rodriguez', 'Miami Beach', 'Appliance Sales Specialist', 'Product Knowledge', '2024-08-30', null, null, null, 'Brand Trainer', null, 'In Progress', 'Samsung certification pending'],
    ['Sean O\'Brien', 'Boston Cambridge', 'Hazmat Handling', 'Safety', '2024-09-15', null, null, null, 'Safety Trainer', null, 'Assigned', 'Required for receiving role'],
    ['Mei Zhang', 'Manhattan East', 'Paint Mixing Certification', 'Product Knowledge', '2024-08-20', '2024-08-18', '2025-08-18', '92%', 'Paint Dept Lead', 'CERT-PM-3501', 'Completed', 'Color matching excellent'],
    ['Tyler Nelson', 'Chicago Lincoln Park', 'Store Opening/Closing', 'Operations', '2024-03-01', '2024-02-25', '2025-02-25', '100%', 'Store Manager', 'CERT-OC-4001', 'Completed', 'Key holder certified'],
    ['Rosa Hernandez', 'Dallas Plano', 'Pro Sales Certification', 'Sales', '2024-06-01', '2024-05-28', '2025-05-28', '96%', 'Pro Sales Trainer', 'CERT-PS-5001', 'Completed', 'Top score in district'],
    ['Derek White', 'Houston Galleria', 'Overnight Safety Protocol', 'Safety', '2024-08-01', '2024-07-30', '2025-07-30', '90%', 'Night Manager', 'CERT-NS-5501', 'Completed', 'Lockout/tagout certified'],
    ['Kenji Tanaka', 'LA Hollywood', 'Pesticide Application License', 'Compliance', '2024-09-30', null, null, null, 'State Instructor', null, 'Assigned', 'CA state requirement'],
    ['Sarah Chen', 'SF Mission Bay', 'Customer Service Excellence', 'Customer Service', '2024-07-15', '2024-07-12', '2025-07-12', '98%', 'Corporate Trainer', 'CERT-CS-6501', 'Completed', 'Highest score in region'],
    ['Brandon Torres', 'Denver Highlands', 'Electrical Code Basics', 'Product Knowledge', '2024-10-01', null, null, null, 'Electrical Specialist', null, 'Assigned', 'Will improve customer assistance'],
    ['Yuki Sato', 'Seattle Capitol Hill', 'Flooring Installation Expert', 'Product Knowledge', '2024-06-15', '2024-06-10', '2026-06-10', '94%', 'Flooring Vendor', 'CERT-FI-7501', 'Completed', 'Measure and install certified'],
    ['Jasmine Brown', 'Charlotte Uptown', 'Cash Handling Procedures', 'Operations', '2024-12-15', '2024-12-10', '2025-12-10', '85%', 'Front End Lead', 'CERT-CH-8001', 'Completed', 'Register balanced 100%'],
    ['Mike Armstrong', 'Detroit Troy', 'Plumbing Code Update 2024', 'Compliance', '2024-08-15', '2024-08-14', '2025-08-14', '91%', 'Code Instructor', 'CERT-PC-9001', 'Completed', 'Annual code update training'],
  ];
  for (const t of training) {
    await pool.query(
      `INSERT INTO training (employee_name,store_name,training_name,category,required_by,completed_date,expiry_date,score,instructor,certification_id,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, t
    );
  }

  // Seed performance_reviews (15)
  const perf = [
    ['John Martinez', 'Atlanta Midtown', 'H1 2024', 'Sarah Mitchell', '4.2/5', '4.5/5', '4.0/5', '4.2/5', 'Achieve department lead certification by Q4', 'Strong customer engagement, reliable attendance', 'Product knowledge in plumbing department', 'Completed'],
    ['Emily Johnson', 'Atlanta Midtown', 'H1 2024', 'Sarah Mitchell', '3.8/5', '3.5/5', '4.0/5', '4.0/5', 'Improve attendance to 98%, learn garden register', 'Quick learner, great with customers', 'Punctuality needs improvement, 3 late arrivals', 'Completed'],
    ['Marcus Williams', 'Atlanta Buckhead', 'H1 2024', 'John Davis', '4.5/5', '5.0/5', '4.5/5', '4.5/5', 'Mentor 2 new hires, reduce lumber waste 10%', 'Exceptional leadership, zero safety incidents', 'Delegate more to team members', 'Completed'],
    ['Ana Rodriguez', 'Miami Beach', 'H1 2024', 'Carlos Rivera', '4.3/5', '4.0/5', '4.5/5', '4.5/5', 'Achieve $500K appliance sales in H2', 'Top appliance seller in district, bilingual asset', 'Follow up on extended warranty offers', 'Completed'],
    ['Sean O\'Brien', 'Boston Cambridge', 'H1 2024', 'Emily Walsh', '3.5/5', '4.0/5', '3.5/5', '3.0/5', 'Cross-train in lumber receiving by Q3', 'Dependable, accurate inventory counts', 'Improve team communication and collaboration', 'Completed'],
    ['Mei Zhang', 'Manhattan East', 'H1 2024', 'Wei Zhang', '4.0/5', '4.5/5', '4.0/5', '3.5/5', 'Complete full-time transition consideration', 'Excellent color matching skills, customer favorites', 'Limited hours restrict contribution', 'Completed'],
    ['Tyler Nelson', 'Chicago Lincoln Park', 'H1 2024', 'Amanda Nelson', '4.7/5', '5.0/5', '4.5/5', '4.5/5', 'Prepare for assistant manager role', 'Natural leader, handles crises well, store knowledge', 'Documentation of incidents could be more detailed', 'Completed'],
    ['Rosa Hernandez', 'Dallas Plano', 'H1 2024', 'Miguel Sanchez', '4.4/5', '4.0/5', '4.5/5', '4.5/5', 'Build pro contractor pipeline to 50 accounts', 'Strong contractor relationships, high ticket sales', 'Weekend availability could increase', 'Completed'],
    ['Derek White', 'Houston Galleria', 'H1 2024', 'Karen White', '3.6/5', '3.0/5', '4.0/5', '3.5/5', 'Achieve zero stocking errors for Q3', 'Efficient stock speed, works well independently', 'Attendance on Sunday nights inconsistent', 'Completed'],
    ['Kenji Tanaka', 'LA Hollywood', 'H1 2024', 'Jason Kim', '4.1/5', '4.5/5', '3.8/5', '4.0/5', 'Get pesticide license, lead spring garden setup', 'Great plant knowledge, customers seek him out', 'Sales per hour below department average', 'Completed'],
    ['Sarah Chen', 'SF Mission Bay', 'H1 2024', 'Diana Chen', '4.8/5', '5.0/5', '4.8/5', '4.5/5', 'Develop customer service training for new hires', 'Best NPS scores in region, natural trainer', 'Take on more inventory responsibilities', 'Completed'],
    ['Brandon Torres', 'Denver Highlands', 'H1 2024', 'Ryan Torres', '3.7/5', '4.0/5', '3.5/5', '3.5/5', 'Complete electrical code basics training', 'Enthusiastic learner, good with technology', 'Limited availability impacts scheduling flexibility', 'Completed'],
    ['Yuki Sato', 'Seattle Capitol Hill', 'H1 2024', 'Nicole Tanaka', '4.6/5', '4.5/5', '4.8/5', '4.5/5', 'Achieve $1M flooring sales annually', 'Top flooring specialist in PNW, exceptional close rate', 'Could improve digital lead follow-up time', 'Completed'],
    ['Jasmine Brown', 'Charlotte Uptown', 'H1 2024', 'Marcus Brown', '3.4/5', '3.0/5', '3.5/5', '3.5/5', 'Improve scan speed to 20 items/min', 'Friendly personality, customers enjoy checkout', 'Speed and accuracy need improvement', 'Completed'],
    ['Mike Armstrong', 'Detroit Troy', 'H1 2024', 'David Armstrong', '4.5/5', '5.0/5', '4.5/5', '4.0/5', 'Train 3 new plumbing associates', 'Master plumber knowledge, customers travel for advice', 'Resistance to new technology tools', 'Completed'],
  ];
  for (const p of perf) {
    await pool.query(
      `INSERT INTO performance_reviews (employee_name,store_name,review_period,reviewer,overall_rating,attendance_score,productivity_score,teamwork_score,goals,strengths,improvements,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, p
    );
  }

  // Seed incidents (15)
  const incidents = [
    ['Atlanta Midtown', 'Customer Injury', 'Customer slipped on wet floor in garden center, minor knee scrape', 'Medium', 'Garden Center', 'John Martinez', '2024-08-03', '2024-08-03', 'Wet floor signs placed, area mopped, incident report filed', 'Resolved', 'Customer refused medical attention'],
    ['Atlanta Midtown', 'Theft', 'Shoplifter apprehended with $450 of power tools at exit', 'Medium', 'Tool Department', 'Loss Prevention', '2024-08-10', '2024-08-10', 'Police called, suspect detained, merchandise recovered', 'Resolved', 'Repeat offender per LP database'],
    ['Atlanta Buckhead', 'Equipment Malfunction', 'Forklift hydraulic leak in lumber yard', 'High', 'Lumber Yard', 'Marcus Williams', '2024-08-05', '2024-08-07', 'Forklift taken out of service, serviced by vendor', 'Resolved', 'Maintenance schedule updated'],
    ['Miami Beach', 'Weather Emergency', 'Tropical storm warning, early store closure', 'High', 'Entire Store', 'Carlos Rivera', '2024-08-08', '2024-08-09', 'Store closed early, associates sent home safely', 'Resolved', 'Emergency protocol followed'],
    ['Boston Cambridge', 'Employee Injury', 'Receiving associate strained back lifting heavy box', 'Medium', 'Receiving Dock', 'Sean O\'Brien', '2024-08-06', null, 'Workers comp claim filed, light duty assigned', 'Open', 'Two-person lift policy reinforced'],
    ['Manhattan East', 'Customer Complaint', 'Paint color mismatch on custom tint, customer escalation', 'Low', 'Paint Department', 'Mei Zhang', '2024-08-09', '2024-08-09', 'Remixed correct color, issued $25 gift card', 'Resolved', 'Machine recalibrated'],
    ['Chicago Lincoln Park', 'Power Outage', 'Brief power outage during thunderstorm, 20 minutes', 'Medium', 'Entire Store', 'Tyler Nelson', '2024-08-07', '2024-08-07', 'Generator activated, POS systems restored', 'Resolved', 'Emergency lighting worked properly'],
    ['Dallas Plano', 'Vendor Issue', 'Lumber delivery 3 hours late, pro customers waiting', 'Medium', 'Lumber', 'Rosa Hernandez', '2024-08-11', '2024-08-11', 'Contacted vendor, rescheduled affected customers', 'Resolved', 'Vendor warning issued'],
    ['Houston Galleria', 'Safety Violation', 'Overnight stocker not wearing safety vest in dock area', 'Low', 'Receiving Dock', 'Night Manager', '2024-08-12', '2024-08-12', 'Verbal warning issued, safety vests restocked', 'Resolved', 'Second occurrence for this employee'],
    ['LA Hollywood', 'Pest Issue', 'Rodent spotted in garden center storage area', 'Medium', 'Garden Center', 'Kenji Tanaka', '2024-08-14', null, 'Pest control called, traps set', 'Open', 'Quarterly pest service increased to monthly'],
    ['SF Mission Bay', 'System Outage', 'POS system crashed during peak hours, 45 min downtime', 'High', 'Front End', 'Sarah Chen', '2024-08-09', '2024-08-09', 'IT remote fix applied, backup registers used', 'Resolved', 'Root cause: software update conflict'],
    ['Denver Highlands', 'Near Miss', 'Pallet fell from top rack, no injuries', 'High', 'Warehouse', 'Ryan Torres', '2024-08-13', '2024-08-14', 'Rack inspection completed, retrained associates', 'Resolved', 'Pallet securing procedure updated'],
    ['Seattle Capitol Hill', 'Customer Altercation', 'Verbal altercation between customers in checkout line', 'Low', 'Front End', 'Nicole Tanaka', '2024-08-10', '2024-08-10', 'Customers separated, one asked to leave', 'Resolved', 'Security presence increased weekends'],
    ['Charlotte Uptown', 'Cash Discrepancy', 'Register 4 short $87.50 at end of shift', 'Medium', 'Front End', 'Marcus Brown', '2024-08-15', null, 'Investigation in progress, camera review', 'Open', 'LP reviewing footage'],
    ['Detroit Troy', 'Water Leak', 'Roof leak over plumbing aisle during heavy rain', 'Medium', 'Plumbing Aisle', 'Mike Armstrong', '2024-08-11', '2024-08-13', 'Temporary repair done, roofing contractor scheduled', 'Resolved', 'Product damage minimal, relocated stock'],
  ];
  for (const i of incidents) {
    await pool.query(
      `INSERT INTO incidents (store_name,incident_type,description,severity,location,reported_by,date_reported,date_resolved,corrective_action,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, i
    );
  }

  // Seed swap_requests (15)
  const swaps = [
    ['John Martinez', 'Emily Johnson', 'Atlanta Midtown', '2024-08-15', 'Morning 6am-2:30pm', '2024-08-16', 'Mid-Day 10am-6:30pm', 'Doctor appointment Thursday morning', 'Sarah Mitchell', 'Approved', 'Both agreed'],
    ['Emily Johnson', 'John Martinez', 'Atlanta Midtown', '2024-08-20', 'Mid-Day 10am-6:30pm', '2024-08-22', 'Mid-Day 10am-6:30pm', 'Friend birthday party Tuesday evening', null, 'Pending', 'Awaiting manager review'],
    ['Marcus Williams', 'Tyler Nelson', 'Atlanta Buckhead', '2024-08-19', 'Morning 5am-1:30pm', '2024-08-21', 'Morning 6am-2:30pm', 'Car service appointment', 'John Davis', 'Approved', 'Cross-store swap approved'],
    ['Ana Rodriguez', 'Rosa Hernandez', 'Miami Beach', '2024-08-23', 'Day 9am-5:30pm', '2024-08-24', 'Day 9am-5:30pm', 'Need Saturday off for family event', null, 'Pending', 'Same role swap'],
    ['Sean O\'Brien', 'John Martinez', 'Boston Cambridge', '2024-08-26', 'Early 4am-12:30pm', '2024-08-27', 'Morning 6am-2:30pm', 'Car trouble, need later start', null, 'Denied', 'Coverage gap would result'],
    ['Tyler Nelson', 'Marcus Williams', 'Chicago Lincoln Park', '2024-08-28', 'Opening 6am-2:30pm', '2024-08-30', 'Opening 6am-2:30pm', 'School event for child Wednesday', 'Amanda Nelson', 'Approved', 'Both shift leads qualified'],
    ['Derek White', 'Kenji Tanaka', 'Houston Galleria', '2024-08-18', 'Overnight 9pm-5:30am', '2024-08-19', 'Day 8am-4:30pm', 'Cannot work overnight Sunday', null, 'Denied', 'Different shift types, not compatible'],
    ['Kenji Tanaka', 'Brandon Torres', 'LA Hollywood', '2024-08-22', 'Day 8am-4:30pm', '2024-08-24', 'Evening 2pm-8pm', 'Need Thursday off', null, 'Pending', 'Part-timer coverage'],
    ['Sarah Chen', 'Yuki Sato', 'SF Mission Bay', '2024-08-29', 'Day 7am-3:30pm', '2024-08-30', 'Day 9am-5:30pm', 'Early meeting Friday', 'Diana Chen', 'Approved', 'Service desk covered'],
    ['Brandon Torres', 'Mei Zhang', 'Denver Highlands', '2024-09-02', 'Evening 2pm-8pm', '2024-09-04', 'Afternoon 12pm-6pm', 'Class schedule change', null, 'Pending', 'Both part-time students'],
    ['Jasmine Brown', 'Emily Johnson', 'Charlotte Uptown', '2024-08-31', 'Day 10am-4pm', '2024-09-01', 'Day 10am-4pm', 'Hair appointment Saturday', null, 'Pending', 'Cross-store request'],
    ['Mike Armstrong', 'Sean O\'Brien', 'Detroit Troy', '2024-09-05', 'Morning 6am-2:30pm', '2024-09-06', 'Morning 6am-2:30pm', 'Fantasy football draft Thursday night', 'David Armstrong', 'Approved', 'Veteran employees, no concerns'],
    ['Rosa Hernandez', 'Ana Rodriguez', 'Dallas Plano', '2024-09-09', 'Day 7am-3:30pm', '2024-09-11', 'Day 7am-3:30pm', 'Contractor meeting Monday', 'Miguel Sanchez', 'Approved', 'Pro desk specialists swap'],
    ['Emily Johnson', 'Jasmine Brown', 'Atlanta Midtown', '2024-09-13', 'Mid-Day 10am-6:30pm', '2024-09-14', 'Day 10am-4pm', 'Concert Friday night', null, 'Pending', 'Different hours, partial coverage'],
    ['Tyler Nelson', 'Mike Armstrong', 'Chicago Lincoln Park', '2024-09-15', 'Opening 6am-2:30pm', '2024-09-17', 'Morning 6am-2:30pm', 'Anniversary dinner Sunday', null, 'Pending', 'Cross-store swap request'],
  ];
  for (const s of swaps) {
    await pool.query(
      `INSERT INTO swap_requests (requester_name,swap_with_name,store_name,original_date,original_shift,swap_date,swap_shift,reason,approved_by,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, s
    );
  }

  // Seed labor_compliance (15)
  const compliance = [
    ['Atlanta Midtown', 'Break Compliance', 'GA Labor Law - Break Requirements', 'Audit of meal and rest break compliance for all shifts', '2024-08-01', 'HR Auditor Kim', 'Compliant', 'None required', '2024-11-01', 'Active', 'All breaks documented in timekeeping system'],
    ['Atlanta Midtown', 'Overtime', 'FLSA Overtime Provisions', 'Review of overtime calculation and authorization procedures', '2024-07-15', 'Payroll Auditor', 'Compliant', 'None required', '2024-10-15', 'Active', 'All OT pre-approved per policy'],
    ['Miami Beach', 'Minor Labor', 'FL Child Labor Laws', 'Audit of work hour restrictions for employees under 18', '2024-08-05', 'HR Compliance', 'Compliant', 'None required', '2024-11-05', 'Active', 'No minors currently scheduled past 10pm'],
    ['Boston Cambridge', 'Predictive Scheduling', 'MA Predictive Scheduling Ordinance', 'Compliance with advance schedule posting requirements', '2024-08-10', 'Legal Compliance', 'Non-Compliant', 'Implement 14-day advance posting by Sep 1', '2024-09-01', 'Corrective Action', 'Currently only posting 10 days ahead'],
    ['Manhattan East', 'Fair Workweek', 'NYC Fair Workweek Law', 'Audit of schedule change premium pay compliance', '2024-07-20', 'Labor Auditor', 'Compliant', 'None required', '2024-10-20', 'Active', 'Premium pay processed for all late changes'],
    ['Chicago Lincoln Park', 'Overtime', 'IL Overtime Law', 'Review of daily and weekly overtime calculations', '2024-08-15', 'Payroll Analyst', 'Compliant', 'None required', '2024-11-15', 'Active', 'System correctly calculates IL rules'],
    ['Dallas Plano', 'Break Compliance', 'TX Labor Code', 'Meal break documentation review', '2024-08-01', 'HR Auditor', 'Compliant', 'None required', '2024-11-01', 'Active', 'TX has limited break requirements'],
    ['Houston Galleria', 'Overnight Safety', 'OSHA Night Shift Requirements', 'Safety compliance audit for overnight shift operations', '2024-07-25', 'Safety Inspector', 'Conditional', 'Add additional lighting in dock area by Aug 30', '2024-08-30', 'Corrective Action', 'Lighting work order submitted'],
    ['LA Hollywood', 'Predictive Scheduling', 'CA Predictive Scheduling (LA)', 'Compliance with LA predictive scheduling ordinance', '2024-08-05', 'Legal Compliance', 'Compliant', 'None required', '2024-11-05', 'Active', 'Schedules posted 14 days ahead'],
    ['SF Mission Bay', 'Predictive Scheduling', 'SF Formula Retail Ordinance', 'Compliance with SF predictive scheduling and hours requirements', '2024-08-10', 'Legal Compliance', 'Compliant', 'None required', '2024-11-10', 'Active', 'Part-time hours offered to current staff first'],
    ['Denver Highlands', 'Wage Compliance', 'CO COMPS Order', 'Minimum wage and overtime compliance review', '2024-08-01', 'Payroll Auditor', 'Compliant', 'None required', '2024-11-01', 'Active', 'All wages above CO minimum'],
    ['Seattle Capitol Hill', 'Secure Scheduling', 'Seattle Secure Scheduling Ordinance', 'Compliance with 14-day advance schedule and premium pay', '2024-07-30', 'Labor Auditor', 'Non-Compliant', 'Update scheduling system for auto premium pay calc', '2024-09-15', 'Corrective Action', 'Premium pay manually calculated currently'],
    ['Charlotte Uptown', 'I-9 Compliance', 'Federal I-9 Requirements', 'Audit of employment eligibility verification documents', '2024-08-15', 'HR Compliance', 'Compliant', 'None required', '2025-08-15', 'Active', 'All I-9s current and properly stored'],
    ['Phoenix Scottsdale', 'Heat Safety', 'OSHA Heat Illness Prevention', 'Outdoor work heat safety compliance for garden center', '2024-07-01', 'Safety Inspector', 'Conditional', 'Add misting stations and enforce 15-min shade breaks', '2024-08-01', 'Active', 'AZ summer temperatures extreme'],
    ['Detroit Troy', 'ADA Compliance', 'ADA - Reasonable Accommodation', 'Audit of scheduling accommodations for disabled employees', '2024-08-10', 'HR Specialist', 'Compliant', 'None required', '2025-08-10', 'Active', 'Two accommodation requests properly handled'],
  ];
  for (const c of compliance) {
    await pool.query(
      `INSERT INTO labor_compliance (store_name,compliance_type,regulation,description,audit_date,auditor,result,corrective_action,deadline,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, c
    );
  }

  console.log('Seed data inserted successfully!');
  console.log('Login credentials: admin@ihss.com / password123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
