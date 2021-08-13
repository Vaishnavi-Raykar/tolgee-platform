import { translationStates } from 'tg.constants/translationStates';
import makeStyles from '@material-ui/core/styles/makeStyles';
import { Box, Tooltip } from '@material-ui/core';
import { T } from '@tolgee/react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { ClassNameMap } from 'notistack';

type State = keyof typeof translationStates;

const HEIGHT = 6;
const BORDER_RADIUS = HEIGHT / 2;
const DOT_SIZE = 6;
const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    minWidth: 150,
  },
  bar: {
    height: HEIGHT,
    backgroundColor: translationStates.UNTRANSLATED.color,
    borderRadius: BORDER_RADIUS,
    width: '100%',
    minWidth: 150,
    overflow: 'hidden',
    display: 'flex',
  },
  state: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS,
    marginLeft: -BORDER_RADIUS,
    transition: 'width 1s ease-in-out',
  },
  loadedState: {
    width: '0 !important',
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    margin: `0 -${theme.spacing(1)}px`,
    '& > *': {
      flexShrink: 0,
      margin: `0 ${theme.spacing(1)}px`,
      marginTop: theme.spacing(0.5),
    },
    fontSize: 14,
    justifyContent: 'space-between',
  },
  legendDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
}));

const STATES_ORDER = [
  'NEEDS_REVIEW',
  'REVIEWED',
  'TRANSLATED',
  'MACHINE_TRANSLATED',
  'UNTRANSLATED',
] as State[];

const STATES_LEGEND = [
  ['NEEDS_REVIEW', 'REVIEWED'],
  ['TRANSLATED', 'MACHINE_TRANSLATED'],
  ['UNTRANSLATED'],
] as State[][];

export function TranslationStatesBar(props: {
  stats: {
    projectId: number;
    keyCount: number;
    languageCount: number;
    translationStateCounts: {
      [state in State]: number;
    };
  };
}) {
  const classes = useStyles();
  const translationsCount = props.stats.languageCount * props.stats.keyCount;
  const [loaded, setLoaded] = useState(false);
  const percents = Object.entries(props.stats.translationStateCounts).reduce(
    (acc, [state, count]) => ({
      ...acc,
      [state]: (count / translationsCount) * 100,
    }),
    {} as { [state in State]: number }
  );

  useEffect(() => {
    setTimeout(() => setLoaded(true), 50);
  }, []);

  const LegendItem = (legendItemProps: {
    classes: ClassNameMap<
      'legendDot' | 'bar' | 'loadedState' | 'legend' | 'root' | 'state'
    >;
    state: State;
  }) => {
    const percent =
      props.stats.translationStateCounts[legendItemProps.state] /
      (props.stats.keyCount * props.stats.languageCount);

    return (
      <Box display="flex" alignItems="center" mr={2}>
        <Box
          data-cy="project-states-bar-dot"
          mr={0.5}
          className={legendItemProps.classes.legendDot}
          style={{
            backgroundColor: translationStates[legendItemProps.state].color,
          }}
        />
        <T>{translationStates[legendItemProps.state].translationKey}</T>:{' '}
        {percent >= 0.01 ? (
          <T
            parameters={{
              percent: percent.toString(),
            }}
          >
            project_dashboard_translations_percent
          </T>
        ) : (
          <T>project_dashboard_translations_less_then_1_percent</T>
        )}
      </Box>
    );
  };

  return (
    <Box className={classes.root} data-cy="project-states-bar-root">
      <Box className={classes.bar} data-cy="project-states-bar-bar">
        {STATES_ORDER.map((state, idx) => (
          <Tooltip
            key={idx}
            title={<T noWrap>{translationStates[state].translationKey}</T>}
          >
            <Box
              data-cy="project-states-bar-state-progress"
              className={clsx({
                [classes.state]: true,
                [classes.loadedState]: !loaded,
              })}
              style={{
                visibility: percents[state] < 0.01 ? 'hidden' : 'initial',
                zIndex: 5 - idx,
                width: `calc(${percents[state]}% + ${BORDER_RADIUS}px)`,
                backgroundColor: translationStates[state].color,
              }}
            />
          </Tooltip>
        ))}
      </Box>
      <Box className={classes.legend} data-cy="project-states-bar-legend">
        {STATES_LEGEND.map(
          (states, idx) =>
            states.reduce(
              (acc, state) => acc + props.stats.translationStateCounts[state],
              0
            ) > 0 && (
              <Box key={idx}>
                {states.map(
                  (state, idx2) =>
                    props.stats.translationStateCounts[state] > 0 && (
                      <LegendItem key={idx2} classes={classes} state={state} />
                    )
                )}
              </Box>
            )
        )}
      </Box>
    </Box>
  );
}