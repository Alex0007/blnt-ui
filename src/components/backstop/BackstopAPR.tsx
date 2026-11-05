import { BackstopPoolV3, BackstopTierV3, FixedMath, PoolEstimate } from '@blend-capital/blend-sdk';
import {
  useBackstop,
  useBackstopPool,
  useBackstopPoolEmissionsV3,
  useBackstopTierTokenV3,
  usePool,
  usePoolMeta,
  usePoolOracle,
} from '../../hooks/api';
import { estSingleSidedDeposit } from '../../utils/comet';
import {
  getAnnualBackstopInterestValue,
  getBackstopEmissionsAprV3,
  getBackstopPoolMetrics,
} from '../../utils/backstop';
import { Version } from '../../utils/version';
import { PoolComponentProps } from '../common/PoolComponentProps';
import { RateDisplay } from '../common/RateDisplay';
import { StackedText } from '../common/StackedText';

export const BackstopAPR: React.FC<PoolComponentProps> = ({ poolId }) => {
  const { data: poolMeta } = usePoolMeta(poolId);
  const { data: pool } = usePool(poolMeta);
  const { data: poolOracle } = usePoolOracle(pool);
  const { data: backstop } = useBackstop(poolMeta?.version);
  const { data: backstopPoolData } = useBackstopPool(poolMeta);
  const { data: v3Emissions } = useBackstopPoolEmissionsV3(poolMeta);
  const { data: firstLossToken } = useBackstopTierTokenV3(BackstopTierV3.FirstLoss, poolMeta);
  const { data: secondLossToken } = useBackstopTierTokenV3(BackstopTierV3.SecondLoss, poolMeta);
  const { data: thirdLossToken } = useBackstopTierTokenV3(BackstopTierV3.ThirdLoss, poolMeta);

  const suppressLegacyApr = poolMeta?.version === Version.V1 || poolMeta?.version === Version.V2;
  let estBackstopApr: number | undefined = suppressLegacyApr ? 0 : undefined;
  let backstopEmissionsApr: number | undefined = suppressLegacyApr ? 0 : undefined;
  const isV3 = backstopPoolData instanceof BackstopPoolV3;

  if (
    !suppressLegacyApr &&
    pool !== undefined &&
    poolOracle !== undefined &&
    backstop !== undefined &&
    backstopPoolData !== undefined
  ) {
    const poolEst = PoolEstimate.build(pool.reserves, poolOracle);
    const backstopPoolEst = getBackstopPoolMetrics(backstop, backstopPoolData);
    if (backstopPoolEst.totalSpotValue > 0) {
      estBackstopApr =
        getAnnualBackstopInterestValue(pool.metadata.backstopRate, poolEst) /
        backstopPoolEst.totalSpotValue;
    }
    if (isV3) {
      backstopEmissionsApr = getBackstopEmissionsAprV3(backstopPoolData, v3Emissions, {
        [BackstopTierV3.FirstLoss]: firstLossToken,
        [BackstopTierV3.SecondLoss]: secondLossToken,
        [BackstopTierV3.ThirdLoss]: thirdLossToken,
      });
    } else {
      backstopEmissionsApr = estSingleSidedDeposit(
        'blnd',
        backstop.backstopToken,
        FixedMath.toFixed(backstopPoolData.emissionPerYearPerBackstopToken(), 7)
      );
    }
  }

  return (
    <StackedText
      title="Backstop APR"
      text={
        estBackstopApr !== undefined ? (
          <RateDisplay
            assetSymbol={isV3 ? 'Backstop capital' : 'BLND-USDC LP'}
            assetRate={estBackstopApr}
            emissionSymbol={isV3 ? 'BLNT LP' : 'BLND-USDC LP'}
            emissionApr={backstopEmissionsApr}
            rateType={'earned'}
            direction={'horizontal'}
          />
        ) : (
          ''
        )
      }
      sx={{ width: '100%', padding: '6px' }}
      tooltip="Estimated APR based on pool interest sharing."
    ></StackedText>
  );
};
