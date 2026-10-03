import React, { useEffect, useState } from "react";
import { CompanyProfile } from "../../company";
import { Link, useParams } from "react-router-dom";
import { getCompanyProfile } from "../../api";
import Sidebar from "../../Components/Sidebar/Sidebar";
import CompanyDashboard from "../../Components/CompanyDashboard/CompanyDashboard";
import Tile from "../../Components/Tile/Tile";
import Spinner from "../../Components/Spinners/Spinner";

interface Props {}

const CompanyPage = (props: Props) => {
  let { ticker } = useParams();

  const [company, setCompany] = useState<CompanyProfile>();
  const [isLoading, setIsLoading] = useState(true);
  const [profileUnavailable, setProfileUnavailable] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const getProfileInit = async () => {
      setIsLoading(true);
      setProfileUnavailable(false);

      try {
        const result = await getCompanyProfile(ticker!);
        const profile = result?.data[0];

        if (isCurrent) {
          setCompany(profile);
          setProfileUnavailable(!profile);
        }
      } catch {
        if (isCurrent) {
          setCompany(undefined);
          setProfileUnavailable(true);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };
    getProfileInit();

    return () => {
      isCurrent = false;
    };
  }, [ticker]);

  return (
    <>
      {isLoading ? (
        <Spinner />
      ) : company ? (
        <div className="relative flex w-full overflow-x-hidden">
          <Sidebar />
          <CompanyDashboard ticker={ticker!}>
            <Tile title="Company" subTitle={company.companyName} />
            <Tile title="Price" subTitle={"$" + company.price.toString()} />
            <Tile title="DCF" subTitle={"$" + company.dcf.toString()} />
            <Tile title="Sector" subTitle={company.sector} />
            <p className="bg-term-panel px-4 py-4 text-[13px] leading-relaxed text-term-muted sm:col-span-2 lg:col-span-4">
              {company.description}
            </p>
          </CompanyDashboard>
        </div>
      ) : profileUnavailable ? (
        <div className="min-h-screen bg-term-ink px-4 pb-16 pt-24 text-term-text sm:px-8">
          <section className="term-panel mx-auto max-w-lg px-8 py-16 text-center">
            <h1 className="font-display text-[20px] font-semibold text-term-text">Company not found</h1>
            <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-term-muted">
              No company profile is available for {ticker}.
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
};

export default CompanyPage;
